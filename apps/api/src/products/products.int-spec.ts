import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals';
import request from 'supertest';
import { createTestApp, type TestApp, truncateAll } from '../testing/test-app.js';

describe('Products (integration)', () => {
  let ctx: TestApp;
  const server = () => ctx.app.getHttpServer();
  const tea = { sku: 'TEA-001', name: 'Green tea 100 g', price: 980, salesStatus: 'on_sale' };

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  beforeEach(async () => {
    await truncateAll(ctx.dataSource);
  });

  it('creates a product with a stock record of 0 and shows it in the list', async () => {
    const created = await request(server()).post('/api/products').send(tea).expect(201);

    expect(created.body).toMatchObject({ id: 1, ...tea });
    await request(server())
      .get('/api/inventory/1')
      .expect(200)
      .expect((res) => expect(res.body).toMatchObject({ productId: 1, quantity: 0 }));
    const list = await request(server()).get('/api/products').expect(200);
    expect(list.body).toHaveLength(1);
  });

  it('lists products by SKU', async () => {
    await request(server()).post('/api/products').send({ ...tea, sku: 'B-1' }).expect(201);
    await request(server()).post('/api/products').send({ ...tea, sku: 'A-1' }).expect(201);

    const list = await request(server()).get('/api/products').expect(200);

    expect(list.body.map((p: { sku: string }) => p.sku)).toEqual(['A-1', 'B-1']);
  });

  it('rejects a duplicate SKU with 409 and creates nothing', async () => {
    await request(server()).post('/api/products').send(tea).expect(201);

    const response = await request(server())
      .post('/api/products')
      .send({ ...tea, name: 'Other' })
      .expect(409);

    expect(response.body).toMatchObject({ code: 'SKU_ALREADY_EXISTS' });
    expect(await ctx.dataSource.query('SELECT count(*)::int AS n FROM inventory_items')).toEqual([
      { n: 1 },
    ]);
  });

  it('edits a product and rejects a SKU that another product uses', async () => {
    await request(server()).post('/api/products').send(tea).expect(201);
    await request(server()).post('/api/products').send({ ...tea, sku: 'TEA-002' }).expect(201);

    const updated = await request(server())
      .patch('/api/products/1')
      .send({ price: 1080, salesStatus: 'discontinued' })
      .expect(200);
    expect(updated.body).toMatchObject({ sku: 'TEA-001', price: 1080, salesStatus: 'discontinued' });

    await request(server()).patch('/api/products/2').send({ sku: 'TEA-001' }).expect(409);
    await request(server()).get('/api/products/1').expect(200).expect((res) => {
      expect(res.body).toMatchObject({ price: 1080 });
    });
  });

  it('returns 404 for an unknown product', async () => {
    await request(server()).get('/api/products/42').expect(404);
    await request(server()).patch('/api/products/42').send({ price: 1 }).expect(404);
  });
});
