import { HttpStatus, Injectable } from '@nestjs/common';
import { DataSource, type EntityManager } from 'typeorm';
import { DomainError, ERROR_CODES, productNotFound } from '../common/domain-error.js';
import { Product } from '../products/product.entity.js';
import { InventoryItem } from './inventory-item.entity.js';
import type { MovementReason } from './movement.js';
import type { StockMovementDto } from './inventory.dto.js';
import { StockMovement } from './stock-movement.entity.js';
import { findShortages, mergeRequests, type StockRequest } from './stock-rules.js';

export interface StockLevel {
  productId: number;
  sku: string;
  name: string;
  salesStatus: Product['salesStatus'];
  quantity: number;
  updatedAt: Date;
}

export interface MovementContext {
  reason: MovementReason;
  orderId?: number;
  note?: string;
}

@Injectable()
export class InventoryService {
  constructor(private readonly dataSource: DataSource) {}

  async listStock(): Promise<StockLevel[]> {
    const items = await this.dataSource.getRepository(InventoryItem).find({
      relations: { product: true },
      order: { product: { sku: 'ASC' } },
    });
    return items.map(toStockLevel);
  }

  async getStock(productId: number): Promise<StockLevel> {
    const item = await this.dataSource.getRepository(InventoryItem).findOne({
      where: { productId },
      relations: { product: true },
    });
    if (!item) {
      throw productNotFound(productId);
    }
    return toStockLevel(item);
  }

  /** Movement history of one product, newest first. */
  async listMovements(productId: number): Promise<StockMovement[]> {
    await this.getStock(productId);
    return this.dataSource.getRepository(StockMovement).find({
      where: { productId },
      order: { createdAt: 'DESC', id: 'DESC' },
    });
  }

  goodsIn(dto: StockMovementDto): Promise<StockMovement> {
    return this.dataSource.transaction(async (manager) => {
      const [movement] = await this.addStock(manager, [dto], { reason: 'goods_in', note: dto.note });
      return movement;
    });
  }

  goodsOut(dto: StockMovementDto): Promise<StockMovement> {
    return this.dataSource.transaction(async (manager) => {
      const [movement] = await this.removeStock(manager, [dto], {
        reason: 'goods_out',
        note: dto.note,
      });
      return movement;
    });
  }

  /** Creates the stock record of a new product. Runs inside the caller's transaction. */
  async openItem(manager: EntityManager, productId: number): Promise<void> {
    await manager.getRepository(InventoryItem).insert({ productId, quantity: 0 });
  }

  /** Adds stock and records the movements. Runs inside the caller's transaction. */
  async addStock(
    manager: EntityManager,
    requests: readonly StockRequest[],
    context: MovementContext,
  ): Promise<StockMovement[]> {
    const merged = mergeRequests(requests);
    const items = await this.lockItems(manager, merged);
    return this.applyChanges(manager, merged, items, 'in', context);
  }

  /**
   * Takes stock out and records the movements. Runs inside the caller's transaction.
   * The rows are locked first, so concurrent callers wait for each other. If any product
   * is short, nothing changes and a 409 error lists every shortage.
   */
  async removeStock(
    manager: EntityManager,
    requests: readonly StockRequest[],
    context: MovementContext,
  ): Promise<StockMovement[]> {
    const merged = mergeRequests(requests);
    const items = await this.lockItems(manager, merged);
    const shortages = findShortages(
      merged,
      new Map([...items.values()].map((item) => [item.productId, item.quantity])),
    );
    if (shortages.length > 0) {
      throw new DomainError(
        HttpStatus.CONFLICT,
        ERROR_CODES.insufficientStock,
        'Not enough stock',
        shortages,
      );
    }
    return this.applyChanges(manager, merged, items, 'out', context);
  }

  /** Locks the stock rows in product id order (`requests` is sorted) to avoid deadlocks. */
  private async lockItems(
    manager: EntityManager,
    requests: readonly StockRequest[],
  ): Promise<Map<number, InventoryItem>> {
    const productIds = requests.map((request) => request.productId);
    const items = await manager
      .getRepository(InventoryItem)
      .createQueryBuilder('item')
      .setLock('pessimistic_write')
      .where('item.productId IN (:...productIds)', { productIds })
      .orderBy('item.productId', 'ASC')
      .getMany();
    const byId = new Map(items.map((item) => [item.productId, item]));
    const missing = productIds.find((id) => !byId.has(id));
    if (missing !== undefined) {
      throw productNotFound(missing);
    }
    return byId;
  }

  private async applyChanges(
    manager: EntityManager,
    requests: readonly StockRequest[],
    items: ReadonlyMap<number, InventoryItem>,
    type: 'in' | 'out',
    context: MovementContext,
  ): Promise<StockMovement[]> {
    const movements: StockMovement[] = [];
    for (const { productId, quantity } of requests) {
      const current = items.get(productId)?.quantity ?? 0;
      const balanceAfter = type === 'in' ? current + quantity : current - quantity;
      await manager.getRepository(InventoryItem).update({ productId }, { quantity: balanceAfter });
      const movementRepository = manager.getRepository(StockMovement);
      movements.push(
        await movementRepository.save(
          movementRepository.create({
            productId,
            type,
            reason: context.reason,
            quantity,
            balanceAfter,
            orderId: context.orderId ?? null,
            note: context.note ?? null,
          }),
        ),
      );
    }
    return movements;
  }
}

function toStockLevel(item: InventoryItem): StockLevel {
  const product = item.product as Product;
  return {
    productId: item.productId,
    sku: product.sku,
    name: product.name,
    salesStatus: product.salesStatus,
    quantity: item.quantity,
    updatedAt: item.updatedAt,
  };
}
