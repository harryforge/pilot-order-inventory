import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals';
import request from 'supertest';
import { createTestApp, type TestApp, truncateAll } from '../testing/test-app.js';

describe('Customers (integration)', () => {
  let ctx: TestApp;
  const server = () => ctx.app.getHttpServer();
  const customer = { name: 'Kasou Shoten', address: '1-2-3 Kasou, Minato, Tokyo', phone: '03-0000-0001' };

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  beforeEach(async () => {
    await truncateAll(ctx.dataSource);
  });

  it('creates, lists and shows customers', async () => {
    const created = await request(server()).post('/api/customers').send(customer).expect(201);
    await request(server())
      .post('/api/customers')
      .send({ ...customer, name: 'Sample Mart' })
      .expect(201);

    expect(created.body).toMatchObject({ id: 1, ...customer });
    const list = await request(server()).get('/api/customers').expect(200);
    expect(list.body.map((c: { name: string }) => c.name)).toEqual(['Kasou Shoten', 'Sample Mart']);
    await request(server())
      .get('/api/customers/1')
      .expect(200)
      .expect((res) => expect(res.body).toMatchObject(customer));
  });

  it('returns 404 for an unknown customer', async () => {
    await request(server()).get('/api/customers/3').expect(404);
  });
});
