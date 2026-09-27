import type { INestApplicationContext } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CustomersService } from '../customers/customers.service.js';
import { truncateAll } from '../database/truncate.js';
import { InventoryService } from '../inventory/inventory.service.js';
import { OrdersService } from '../orders/orders.service.js';
import { ProductsService } from '../products/products.service.js';
import type { SeedData } from './seed-data.js';

export interface SeedSummary {
  products: number;
  customers: number;
  orders: number;
  shipped: number;
}

export class SeedRefusedError extends Error {}

/**
 * Loads the sample data through the real services, so orders check and deduct stock exactly
 * as in normal use. Afterwards the timestamps are moved back to the planned dates, so the
 * lists show a history of several months.
 * The steps are not one transaction: if a run stops half way, run it again with `--reset`.
 */
export async function runSeed(
  app: INestApplicationContext,
  data: SeedData,
  options: { reset: boolean },
): Promise<SeedSummary> {
  const dataSource = app.get(DataSource);
  const [{ n }] = (await dataSource.query('SELECT count(*)::int AS n FROM products')) as {
    n: number;
  }[];
  if (n > 0 && !options.reset) {
    throw new SeedRefusedError(
      'The database already has data. Run with --reset to delete everything and seed again.',
    );
  }
  if (options.reset) {
    await truncateAll(dataSource);
  }

  const productIds = await seedProducts(app, dataSource, data);
  const customerIds = await seedCustomers(app, dataSource, data);
  const shipped = await seedOrders(app, dataSource, data, productIds, customerIds);
  return {
    products: productIds.length,
    customers: customerIds.length,
    orders: data.orders.length,
    shipped,
  };
}

async function seedProducts(
  app: INestApplicationContext,
  dataSource: DataSource,
  data: SeedData,
): Promise<number[]> {
  const products = app.get(ProductsService);
  const inventory = app.get(InventoryService);
  const ids: number[] = [];
  for (const { openingStock, ...input } of data.products) {
    const product = await products.create(input);
    await inventory.goodsIn({ productId: product.id, quantity: openingStock, note: 'Opening stock' });
    ids.push(product.id);
  }
  const at = data.openingStockAt;
  await dataSource.query('UPDATE products SET created_at = $1, updated_at = $1', [at]);
  await dataSource.query('UPDATE stock_movements SET created_at = $1', [at]);
  return ids;
}

async function seedCustomers(
  app: INestApplicationContext,
  dataSource: DataSource,
  data: SeedData,
): Promise<number[]> {
  const customers = app.get(CustomersService);
  const ids: number[] = [];
  for (const input of data.customers) {
    ids.push((await customers.create(input)).id);
  }
  await dataSource.query('UPDATE customers SET created_at = $1', [data.openingStockAt]);
  return ids;
}

async function seedOrders(
  app: INestApplicationContext,
  dataSource: DataSource,
  data: SeedData,
  productIds: readonly number[],
  customerIds: readonly number[],
): Promise<number> {
  const orders = app.get(OrdersService);
  let shipped = 0;
  for (const planned of data.orders) {
    const order = await orders.create({
      customerId: customerIds[planned.customer],
      lines: planned.lines.map((line) => ({
        productId: productIds[line.product],
        quantity: line.quantity,
      })),
    });
    if (planned.shippedAt) {
      await orders.ship(order.id);
      shipped += 1;
    }
    await dataSource.query('UPDATE orders SET ordered_at = $1, shipped_at = $2 WHERE id = $3', [
      planned.orderedAt,
      planned.shippedAt,
      order.id,
    ]);
    await dataSource.query('UPDATE stock_movements SET created_at = $1 WHERE order_id = $2', [
      planned.orderedAt,
      order.id,
    ]);
  }
  // Stock records show the time of their last movement.
  await dataSource.query(`
    UPDATE inventory_items AS item SET updated_at = last.at
    FROM (SELECT product_id, max(created_at) AS at FROM stock_movements GROUP BY product_id) AS last
    WHERE last.product_id = item.product_id
  `);
  return shipped;
}
