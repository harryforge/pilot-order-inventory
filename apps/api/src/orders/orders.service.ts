import { HttpStatus, Injectable } from '@nestjs/common';
import { DataSource, In, type EntityManager } from 'typeorm';
import {
  customerNotFound,
  DomainError,
  ERROR_CODES,
  orderNotFound,
  productNotFound,
} from '../common/domain-error.js';
import { Customer } from '../customers/customer.entity.js';
import { InventoryService } from '../inventory/inventory.service.js';
import { Product } from '../products/product.entity.js';
import { OrderLine } from './order-line.entity.js';
import { formatOrderNumber, likePattern, priceLines } from './order-rules.js';
import { canTransition, ORDER_STATUS, type OrderStatus } from './order-status.js';
import { Order } from './order.entity.js';
import { type CreateOrderDto, type ListOrdersQuery, MAX_LINE_QUANTITY } from './order.dto.js';

/** Largest order total that fits the `integer` columns. */
const MAX_ORDER_TOTAL = 2_147_483_647;

@Injectable()
export class OrdersService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly inventoryService: InventoryService,
  ) {}

  /** Orders matching the filters, newest first, with the customer. No pagination yet. */
  list(query: ListOrdersQuery): Promise<Order[]> {
    const builder = this.dataSource
      .getRepository(Order)
      .createQueryBuilder('order')
      .innerJoinAndSelect('order.customer', 'customer')
      .orderBy('order.orderedAt', 'DESC')
      .addOrderBy('order.id', 'DESC');
    if (query.orderNumber) {
      builder.andWhere('order.orderNumber ILIKE :orderNumber', {
        orderNumber: likePattern(query.orderNumber),
      });
    }
    if (query.customer) {
      builder.andWhere('customer.name ILIKE :customer', { customer: likePattern(query.customer) });
    }
    return builder.getMany();
  }

  /** One order with its customer and its lines (with product). */
  async get(id: number): Promise<Order> {
    const order = await this.dataSource.getRepository(Order).findOne({
      where: { id },
      relations: { customer: true, lines: { product: true } },
      order: { lines: { id: 'ASC' } },
    });
    if (!order) {
      throw orderNotFound(id);
    }
    return order;
  }

  /**
   * Creates an order and takes its stock in **one transaction**. If a product is short, unknown
   * or not on sale, nothing is saved: no order, no lines, no stock change.
   */
  async create(dto: CreateOrderDto): Promise<Order> {
    // The DTO checks this at the HTTP boundary; the service checks again for other callers (seed).
    if (dto.lines.length === 0) {
      throw new DomainError(
        HttpStatus.BAD_REQUEST,
        ERROR_CODES.invalidOrderLines,
        'An order needs at least one line',
      );
    }
    const orderId = await this.dataSource.transaction(async (manager) => {
      await this.requireCustomer(manager, dto.customerId);
      const products = await this.loadOrderableProducts(manager, dto);
      const priced = priceLines(dto.lines, products);
      this.assertLineQuantities(priced.lines);
      if (priced.totalAmount > MAX_ORDER_TOTAL) {
        throw new DomainError(
          HttpStatus.BAD_REQUEST,
          ERROR_CODES.orderTotalTooLarge,
          'The order total is too large',
        );
      }

      const order = await manager.getRepository(Order).save(
        manager.getRepository(Order).create({
          orderNumber: await this.nextOrderNumber(manager),
          customerId: dto.customerId,
          status: ORDER_STATUS.received,
          totalAmount: priced.totalAmount,
          shippedAt: null,
        }),
      );
      await manager
        .getRepository(OrderLine)
        .insert(priced.lines.map((line) => ({ ...line, orderId: order.id })));
      // Locks the stock rows, checks every line and deducts; throws (and rolls back) if short.
      await this.inventoryService.removeStock(manager, priced.lines, {
        reason: 'order',
        orderId: order.id,
      });
      return order.id;
    });
    return this.get(orderId);
  }

  /** Moves an order from 受付 to 出荷済. Any other change is refused with 409. */
  async ship(id: number): Promise<Order> {
    await this.dataSource.transaction(async (manager) => {
      const order = await manager
        .getRepository(Order)
        .findOne({ where: { id }, lock: { mode: 'pessimistic_write' } });
      if (!order) {
        throw orderNotFound(id);
      }
      this.assertTransition(order.status, ORDER_STATUS.shipped);
      await manager
        .getRepository(Order)
        .update({ id }, { status: ORDER_STATUS.shipped, shippedAt: new Date() });
    });
    return this.get(id);
  }

  private assertTransition(from: OrderStatus, to: OrderStatus): void {
    if (!canTransition(from, to)) {
      throw new DomainError(
        HttpStatus.CONFLICT,
        ERROR_CODES.invalidStatusTransition,
        `An order in status ${from} cannot move to ${to}`,
        { from, to },
      );
    }
  }

  /** The quantity limit applies per product, after lines for the same product are merged. */
  private assertLineQuantities(lines: readonly { productId: number; quantity: number }[]): void {
    const tooLarge = lines.filter((line) => line.quantity > MAX_LINE_QUANTITY);
    if (tooLarge.length > 0) {
      throw new DomainError(
        HttpStatus.BAD_REQUEST,
        ERROR_CODES.invalidOrderLines,
        `The quantity per product must be at most ${MAX_LINE_QUANTITY}`,
        tooLarge.map(({ productId, quantity }) => ({ productId, quantity })),
      );
    }
  }

  private async requireCustomer(manager: EntityManager, customerId: number): Promise<void> {
    const exists = await manager.getRepository(Customer).existsBy({ id: customerId });
    if (!exists) {
      throw customerNotFound(customerId);
    }
  }

  private async loadOrderableProducts(
    manager: EntityManager,
    dto: CreateOrderDto,
  ): Promise<Map<number, Product>> {
    const ids = [...new Set(dto.lines.map((line) => line.productId))];
    const products = await manager.getRepository(Product).findBy({ id: In(ids) });
    const byId = new Map(products.map((product) => [product.id, product]));
    const missing = ids.find((id) => !byId.has(id));
    if (missing !== undefined) {
      throw productNotFound(missing);
    }
    const notOnSale = products.filter((product) => product.salesStatus !== 'on_sale');
    if (notOnSale.length > 0) {
      throw new DomainError(
        HttpStatus.CONFLICT,
        ERROR_CODES.productNotOnSale,
        'Some products are not on sale',
        notOnSale.map((product) => ({ productId: product.id, salesStatus: product.salesStatus })),
      );
    }
    return byId;
  }

  private async nextOrderNumber(manager: EntityManager): Promise<string> {
    const [row] = (await manager.query("SELECT nextval('order_number_seq') AS value")) as {
      value: string;
    }[];
    return formatOrderNumber(Number(row.value));
  }
}
