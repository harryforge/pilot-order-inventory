import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { Injectable } from '@nestjs/common';
import request from 'supertest';
import type { EntityManager } from 'typeorm';
import {
  InventoryService,
  type MovementContext,
} from '../inventory/inventory.service.js';
import type { StockMovement } from '../inventory/stock-movement.entity.js';
import type { StockRequest } from '../inventory/stock-rules.js';
import { createTestApp, type TestApp } from '../testing/test-app.js';

/** Deducts the stock as usual, then fails, as a crash after the deduction would. */
@Injectable()
class FailingAfterDeduction extends InventoryService {
  override async removeStock(
    manager: EntityManager,
    requests: readonly StockRequest[],
    context: MovementContext,
  ): Promise<StockMovement[]> {
    const movements = await super.removeStock(manager, requests, context);
    if (context.reason === 'order') {
      throw new Error('Simulated failure after the stock was deducted');
    }
    return movements;
  }
}

/** R02 AC2: the stock deduction and the order are saved in one transaction. */
describe('Order creation rollback (integration)', () => {
  let ctx: TestApp;
  const server = () => ctx.app.getHttpServer();

  beforeAll(async () => {
    ctx = await createTestApp((builder) =>
      builder.overrideProvider(InventoryService).useClass(FailingAfterDeduction),
    );
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  it('rolls back the deduction, the order and its lines when a later step fails', async () => {
    const product = await request(server())
      .post('/api/products')
      .send({ sku: 'TEA-001', name: 'Green tea', price: 980, salesStatus: 'on_sale' })
      .expect(201);
    await request(server())
      .post('/api/inventory/goods-in')
      .send({ productId: product.body.id, quantity: 10 })
      .expect(201);
    const customer = await request(server())
      .post('/api/customers')
      .send({ name: 'Kasou Shoten', address: '1-2-3 Kasou, Tokyo', phone: '03-0000-0001' })
      .expect(201);

    await request(server())
      .post('/api/orders')
      .send({ customerId: customer.body.id, lines: [{ productId: product.body.id, quantity: 4 }] })
      .expect(500);

    const stock = await request(server()).get(`/api/inventory/${product.body.id}`).expect(200);
    expect(stock.body.quantity).toBe(10);
    const [counts] = (await ctx.dataSource.query(`
      SELECT (SELECT count(*)::int FROM orders) AS orders,
             (SELECT count(*)::int FROM order_lines) AS lines,
             (SELECT count(*)::int FROM stock_movements WHERE reason = 'order') AS movements
    `)) as { orders: number; lines: number; movements: number }[];
    expect(counts).toEqual({ orders: 0, lines: 0, movements: 0 });
  });
});
