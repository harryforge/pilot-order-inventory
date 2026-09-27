import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals';
import request from 'supertest';
import { createTestApp, type TestApp, truncateAll } from '../testing/test-app.js';

describe('Inventory (integration)', () => {
  let ctx: TestApp;
  const server = () => ctx.app.getHttpServer();

  async function createProduct(sku: string): Promise<number> {
    const response = await request(server())
      .post('/api/products')
      .send({ sku, name: `Product ${sku}`, price: 500, salesStatus: 'on_sale' })
      .expect(201);
    return response.body.id as number;
  }

  async function stockOf(productId: number): Promise<number> {
    const response = await request(server()).get(`/api/inventory/${productId}`).expect(200);
    return response.body.quantity as number;
  }

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  beforeEach(async () => {
    await truncateAll(ctx.dataSource);
  });

  it('adds and removes stock and keeps the movement history, newest first', async () => {
    const productId = await createProduct('RICE-5KG');

    await request(server())
      .post('/api/inventory/goods-in')
      .send({ productId, quantity: 20, note: 'First delivery' })
      .expect(201);
    const out = await request(server())
      .post('/api/inventory/goods-out')
      .send({ productId, quantity: 8 })
      .expect(201);

    expect(out.body).toMatchObject({ type: 'out', reason: 'goods_out', quantity: 8, balanceAfter: 12 });
    expect(await stockOf(productId)).toBe(12);
    const history = await request(server()).get(`/api/inventory/${productId}/movements`).expect(200);
    expect(history.body).toMatchObject([
      { type: 'out', reason: 'goods_out', quantity: 8, balanceAfter: 12, note: null },
      { type: 'in', reason: 'goods_in', quantity: 20, balanceAfter: 20, note: 'First delivery' },
    ]);
  });

  it('refuses goods out beyond the stock and changes nothing', async () => {
    const productId = await createProduct('MISO-1');
    await request(server()).post('/api/inventory/goods-in').send({ productId, quantity: 3 });

    const response = await request(server())
      .post('/api/inventory/goods-out')
      .send({ productId, quantity: 4 })
      .expect(409);

    expect(response.body).toMatchObject({
      code: 'INSUFFICIENT_STOCK',
      details: [{ productId, requested: 4, available: 3 }],
    });
    expect(await stockOf(productId)).toBe(3);
    const history = await request(server()).get(`/api/inventory/${productId}/movements`);
    expect(history.body).toHaveLength(1);
  });

  it('never lets concurrent goods out take more than the stock', async () => {
    const productId = await createProduct('SOY-500');
    await request(server()).post('/api/inventory/goods-in').send({ productId, quantity: 5 });

    const results = await Promise.all(
      Array.from({ length: 8 }, () =>
        request(server()).post('/api/inventory/goods-out').send({ productId, quantity: 1 }),
      ),
    );

    const statuses = results.map((res) => res.status).sort();
    expect(statuses).toEqual([201, 201, 201, 201, 201, 409, 409, 409]);
    expect(await stockOf(productId)).toBe(0);
  });

  it('lists the stock of every product by SKU', async () => {
    await createProduct('B-2');
    await createProduct('A-1');

    const list = await request(server()).get('/api/inventory').expect(200);

    expect(list.body).toMatchObject([
      { sku: 'A-1', quantity: 0, salesStatus: 'on_sale' },
      { sku: 'B-2', quantity: 0 },
    ]);
  });

  it('returns 404 for an unknown product', async () => {
    await request(server()).get('/api/inventory/9').expect(404);
    await request(server()).get('/api/inventory/9/movements').expect(404);
    await request(server())
      .post('/api/inventory/goods-in')
      .send({ productId: 9, quantity: 1 })
      .expect(404);
  });
});
