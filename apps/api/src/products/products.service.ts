import { HttpStatus, Injectable } from '@nestjs/common';
import { DataSource, type EntityManager } from 'typeorm';
import { definedOnly } from '../common/defined-only.js';
import { DomainError, ERROR_CODES, productNotFound } from '../common/domain-error.js';
import { isUniqueViolation } from '../common/postgres-errors.js';
import { InventoryService } from '../inventory/inventory.service.js';
import { Product } from './product.entity.js';
import type { CreateProductDto, UpdateProductDto } from './product.dto.js';

const SKU_UNIQUE_CONSTRAINT = 'uq_products_sku';

@Injectable()
export class ProductsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly inventoryService: InventoryService,
  ) {}

  list(): Promise<Product[]> {
    return this.dataSource.getRepository(Product).find({ order: { sku: 'ASC' } });
  }

  async get(id: number): Promise<Product> {
    const product = await this.dataSource.getRepository(Product).findOneBy({ id });
    if (!product) {
      throw productNotFound(id);
    }
    return product;
  }

  /** Creates the product and its stock record (quantity 0) in one transaction. */
  async create(dto: CreateProductDto): Promise<Product> {
    return this.withSkuCheck(dto.sku, () =>
      this.dataSource.transaction(async (manager) => {
        const product = await manager.getRepository(Product).save(
          manager.getRepository(Product).create({ ...dto }),
        );
        await this.inventoryService.openItem(manager, product.id);
        return product;
      }),
    );
  }

  async update(id: number, dto: UpdateProductDto): Promise<Product> {
    return this.withSkuCheck(dto.sku, () =>
      this.dataSource.transaction(async (manager) => {
        const product = await this.getForUpdate(manager, id);
        return manager.getRepository(Product).save({ ...product, ...definedOnly(dto) });
      }),
    );
  }

  private async getForUpdate(manager: EntityManager, id: number): Promise<Product> {
    const product = await manager
      .getRepository(Product)
      .findOne({ where: { id }, lock: { mode: 'pessimistic_write' } });
    if (!product) {
      throw productNotFound(id);
    }
    return product;
  }

  /** Turns the unique index violation on `sku` into a clear 409 error. */
  private async withSkuCheck<T>(sku: string | undefined, work: () => Promise<T>): Promise<T> {
    try {
      return await work();
    } catch (error) {
      if (isUniqueViolation(error, SKU_UNIQUE_CONSTRAINT)) {
        throw new DomainError(
          HttpStatus.CONFLICT,
          ERROR_CODES.skuAlreadyExists,
          `SKU ${sku ?? ''} is already used by another product`,
        );
      }
      throw error;
    }
  }
}
