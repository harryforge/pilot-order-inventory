import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import request from 'supertest';
import { createTestApp, type TestApp } from '../testing/test-app.js';
import { MIGRATIONS } from './migrations.js';

describe('Migrations (integration)', () => {
  let ctx: TestApp;

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  it('revert one by one and apply again on a database that holds orders', async () => {
    const server = ctx.app.getHttpServer();
    const product = await request(server)
      .post('/api/products')
      .send({ sku: 'TEA-001', name: 'Green tea', price: 980, salesStatus: 'on_sale' })
      .expect(201);
    await request(server)
      .post('/api/inventory/goods-in')
      .send({ productId: product.body.id, quantity: 5 })
      .expect(201);
    const customer = await request(server)
      .post('/api/customers')
      .send({ name: 'Kasou Shoten', address: '1-2-3 Kasou, Tokyo', phone: '03-0000-0001' })
      .expect(201);
    await request(server)
      .post('/api/orders')
      .send({ customerId: customer.body.id, lines: [{ productId: product.body.id, quantity: 2 }] })
      .expect(201);

    // Reverting the orders migration keeps the stock history but drops its order links.
    await ctx.dataSource.undoLastMigration();
    await expect(ctx.dataSource.runMigrations()).resolves.toHaveLength(1);
    const links = (await ctx.dataSource.query(
      "SELECT order_id FROM stock_movements WHERE reason = 'order'",
    )) as { order_id: number | null }[];
    expect(links).toEqual([{ order_id: null }]);

    for (let i = 0; i < MIGRATIONS.length; i += 1) {
      await ctx.dataSource.undoLastMigration();
    }
    await expect(ctx.dataSource.runMigrations()).resolves.toHaveLength(MIGRATIONS.length);
  });
});
