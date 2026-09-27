import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals';
import request from 'supertest';
import { createTestApp, type TestApp, truncateAll } from '../testing/test-app.js';
import { OrdersService } from './orders.service.js';

/**
 * R02 AC2: stock deduction when an order is created. Runs against PostgreSQL because the
 * guarantees (one transaction, row locks, check constraints) live in the database.
 */
describe('Orders (integration)', () => {
  let ctx: TestApp;
  const server = () => ctx.app.getHttpServer();

  async function createProduct(sku: string, price: number, stock: number): Promise<number> {
    const product = await request(server())
      .post('/api/products')
      .send({ sku, name: `Product ${sku}`, price, salesStatus: 'on_sale' })
      .expect(201);
    if (stock > 0) {
      await request(server())
        .post('/api/inventory/goods-in')
        .send({ productId: product.body.id, quantity: stock })
        .expect(201);
    }
    return product.body.id as number;
  }

  async function createCustomer(name = 'Kasou Shoten'): Promise<number> {
    const customer = await request(server())
      .post('/api/customers')
      .send({ name, address: '1-2-3 Kasou, Tokyo', phone: '03-0000-0001' })
      .expect(201);
    return customer.body.id as number;
  }

  async function stockOf(productId: number): Promise<number> {
    const response = await request(server()).get(`/api/inventory/${productId}`).expect(200);
    return response.body.quantity as number;
  }

  async function count(table: string): Promise<number> {
    const [row] = (await ctx.dataSource.query(`SELECT count(*)::int AS n FROM ${table}`)) as {
      n: number;
    }[];
    return row.n;
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

  describe('creating an order', () => {
    it('deducts the stock of every line, records the movements and totals the order', async () => {
      const customerId = await createCustomer();
      const tea = await createProduct('TEA-001', 980, 10);
      const rice = await createProduct('RICE-5KG', 2400, 4);

      const response = await request(server())
        .post('/api/orders')
        .send({
          customerId,
          lines: [
            { productId: tea, quantity: 3 },
            { productId: rice, quantity: 4 },
          ],
        })
        .expect(201);

      expect(response.body).toMatchObject({
        orderNumber: 'SO-000001',
        status: '受付',
        totalAmount: 3 * 980 + 4 * 2400,
        shippedAt: null,
        customer: { id: customerId, name: 'Kasou Shoten' },
        lines: [
          { productId: tea, quantity: 3, unitPrice: 980, lineAmount: 2940, product: { sku: 'TEA-001' } },
          { productId: rice, quantity: 4, unitPrice: 2400, lineAmount: 9600 },
        ],
      });
      expect(await stockOf(tea)).toBe(7);
      expect(await stockOf(rice)).toBe(0);
      const movements = await request(server()).get(`/api/inventory/${tea}/movements`);
      expect(movements.body[0]).toMatchObject({
        type: 'out',
        reason: 'order',
        quantity: 3,
        balanceAfter: 7,
        orderId: response.body.id,
      });
    });

    it('merges lines for the same product into one line', async () => {
      const customerId = await createCustomer();
      const tea = await createProduct('TEA-001', 100, 5);

      const response = await request(server())
        .post('/api/orders')
        .send({
          customerId,
          lines: [
            { productId: tea, quantity: 2 },
            { productId: tea, quantity: 3 },
          ],
        })
        .expect(201);

      expect(response.body.lines).toMatchObject([{ productId: tea, quantity: 5, lineAmount: 500 }]);
      expect(await stockOf(tea)).toBe(0);
    });

    it('keeps the price of the order when the product price changes later', async () => {
      const customerId = await createCustomer();
      const tea = await createProduct('TEA-001', 980, 5);
      const order = await request(server())
        .post('/api/orders')
        .send({ customerId, lines: [{ productId: tea, quantity: 1 }] })
        .expect(201);

      await request(server()).patch(`/api/products/${tea}`).send({ price: 1200 }).expect(200);

      const reloaded = await request(server()).get(`/api/orders/${order.body.id}`).expect(200);
      expect(reloaded.body).toMatchObject({ totalAmount: 980, lines: [{ unitPrice: 980 }] });
    });
  });

  describe('insufficient stock', () => {
    it('refuses the whole order, lists the shortages and changes nothing', async () => {
      const customerId = await createCustomer();
      const tea = await createProduct('TEA-001', 980, 10);
      const rice = await createProduct('RICE-5KG', 2400, 1);
      const miso = await createProduct('MISO-1', 500, 0);

      const response = await request(server())
        .post('/api/orders')
        .send({
          customerId,
          lines: [
            { productId: tea, quantity: 5 },
            { productId: rice, quantity: 2 },
            { productId: miso, quantity: 1 },
          ],
        })
        .expect(409);

      expect(response.body).toMatchObject({
        code: 'INSUFFICIENT_STOCK',
        details: [
          { productId: rice, requested: 2, available: 1 },
          { productId: miso, requested: 1, available: 0 },
        ],
      });
      // The line that had enough stock was not deducted either.
      expect(await stockOf(tea)).toBe(10);
      expect(await stockOf(rice)).toBe(1);
      expect(await count('orders')).toBe(0);
      expect(await count('order_lines')).toBe(0);
      expect(await count("stock_movements WHERE reason = 'order'")).toBe(0);
    });

    it('checks the total quantity when a product appears on several lines', async () => {
      const customerId = await createCustomer();
      const tea = await createProduct('TEA-001', 980, 4);

      const response = await request(server())
        .post('/api/orders')
        .send({
          customerId,
          lines: [
            { productId: tea, quantity: 3 },
            { productId: tea, quantity: 2 },
          ],
        })
        .expect(409);

      expect(response.body.details).toEqual([{ productId: tea, requested: 5, available: 4 }]);
      expect(await stockOf(tea)).toBe(4);
    });

    it('accepts an order that takes exactly the remaining stock', async () => {
      const customerId = await createCustomer();
      const tea = await createProduct('TEA-001', 980, 4);

      await request(server())
        .post('/api/orders')
        .send({ customerId, lines: [{ productId: tea, quantity: 4 }] })
        .expect(201);

      expect(await stockOf(tea)).toBe(0);
    });
  });

  describe('other refusals', () => {
    it('refuses unknown customers and products and products that are not on sale', async () => {
      const customerId = await createCustomer();
      const tea = await createProduct('TEA-001', 980, 10);
      await request(server()).patch(`/api/products/${tea}`).send({ salesStatus: 'discontinued' });

      const unknownCustomer = await request(server())
        .post('/api/orders')
        .send({ customerId: 999, lines: [{ productId: tea, quantity: 1 }] })
        .expect(404);
      const unknownProduct = await request(server())
        .post('/api/orders')
        .send({ customerId, lines: [{ productId: 999, quantity: 1 }] })
        .expect(404);
      const discontinued = await request(server())
        .post('/api/orders')
        .send({ customerId, lines: [{ productId: tea, quantity: 1 }] })
        .expect(409);

      expect(unknownCustomer.body.code).toBe('CUSTOMER_NOT_FOUND');
      expect(unknownProduct.body.code).toBe('PRODUCT_NOT_FOUND');
      expect(discontinued.body).toMatchObject({
        code: 'PRODUCT_NOT_ON_SALE',
        details: [{ productId: tea, salesStatus: 'discontinued' }],
      });
      expect(await stockOf(tea)).toBe(10);
      expect(await count('orders')).toBe(0);
    });
  });

  it('applies the quantity limit per product after merging lines, and needs a line', async () => {
    const customerId = await createCustomer();
    const tea = await createProduct('TEA-001', 1, 5000);

    const response = await request(server())
      .post('/api/orders')
      .send({
        customerId,
        lines: [
          { productId: tea, quantity: 1000 },
          { productId: tea, quantity: 1 },
        ],
      })
      .expect(400);

    expect(response.body).toMatchObject({
      code: 'INVALID_ORDER_LINES',
      details: [{ productId: tea, quantity: 1001 }],
    });
    expect(await stockOf(tea)).toBe(5000);
    await expect(
      ctx.app.get(OrdersService).create({ customerId, lines: [] }),
    ).rejects.toMatchObject({ response: { code: 'INVALID_ORDER_LINES' } });
    expect(await count('orders')).toBe(0);
  });

  describe('concurrent orders', () => {
    it('never sells more than the stock', async () => {
      const customerId = await createCustomer();
      const tea = await createProduct('TEA-001', 980, 5);

      const results = await Promise.all(
        Array.from({ length: 10 }, () =>
          request(server())
            .post('/api/orders')
            .send({ customerId, lines: [{ productId: tea, quantity: 1 }] }),
        ),
      );

      const statuses = results.map((res) => res.status);
      expect(statuses.filter((status) => status === 201)).toHaveLength(5);
      expect(statuses.filter((status) => status === 409)).toHaveLength(5);
      expect(await stockOf(tea)).toBe(0);
      expect(await count('orders')).toBe(5);
      expect(await count("stock_movements WHERE reason = 'order'")).toBe(5);
      // Every movement saw the balance left by the one before it.
      const balances = (await ctx.dataSource.query(
        "SELECT balance_after AS b FROM stock_movements WHERE reason = 'order' ORDER BY id",
      )) as { b: number }[];
      expect(balances.map((row) => row.b)).toEqual([4, 3, 2, 1, 0]);
    });

    it('does not deadlock when orders list the same products in opposite order', async () => {
      const customerId = await createCustomer();
      const tea = await createProduct('TEA-001', 100, 50);
      const rice = await createProduct('RICE-5KG', 200, 50);

      const results = await Promise.all(
        Array.from({ length: 16 }, (_, i) => {
          const lines = [
            { productId: tea, quantity: 1 },
            { productId: rice, quantity: 2 },
          ];
          return request(server())
            .post('/api/orders')
            .send({ customerId, lines: i % 2 === 0 ? lines : [...lines].reverse() });
        }),
      );

      expect(results.every((res) => res.status === 201)).toBe(true);
      expect(await stockOf(tea)).toBe(50 - 16);
      expect(await stockOf(rice)).toBe(50 - 32);
      const numbers = new Set(results.map((res) => res.body.orderNumber as string));
      expect(numbers.size).toBe(16);
    });
  });

  describe('order list and shipping', () => {
    it('searches by part of the order number and of the customer name, newest first', async () => {
      const kasou = await createCustomer('Kasou Shoten');
      const sample = await createCustomer('Sample Mart');
      const tea = await createProduct('TEA-001', 100, 100);
      for (const customerId of [kasou, sample, kasou]) {
        await request(server())
          .post('/api/orders')
          .send({ customerId, lines: [{ productId: tea, quantity: 1 }] })
          .expect(201);
      }

      const all = await request(server()).get('/api/orders').expect(200);
      const byCustomer = await request(server()).get('/api/orders?customer=kasou').expect(200);
      const byNumber = await request(server()).get('/api/orders?orderNumber=002').expect(200);
      const both = await request(server())
        .get('/api/orders?orderNumber=so-&customer=mart')
        .expect(200);
      const wildcard = await request(server()).get('/api/orders?customer=%25').expect(200);

      const numbers = (res: request.Response) =>
        res.body.map((order: { orderNumber: string }) => order.orderNumber);
      expect(numbers(all)).toEqual(['SO-000003', 'SO-000002', 'SO-000001']);
      expect(all.body[0]).toMatchObject({ customer: { name: 'Kasou Shoten' }, status: '受付' });
      expect(numbers(byCustomer)).toEqual(['SO-000003', 'SO-000001']);
      expect(numbers(byNumber)).toEqual(['SO-000002']);
      expect(numbers(both)).toEqual(['SO-000002']);
      expect(numbers(wildcard)).toEqual([]);
    });

    it('ships a received order once and refuses to ship it again', async () => {
      const customerId = await createCustomer();
      const tea = await createProduct('TEA-001', 100, 5);
      const order = await request(server())
        .post('/api/orders')
        .send({ customerId, lines: [{ productId: tea, quantity: 2 }] })
        .expect(201);

      const shipped = await request(server()).post(`/api/orders/${order.body.id}/ship`).expect(201);
      const again = await request(server()).post(`/api/orders/${order.body.id}/ship`).expect(409);

      expect(shipped.body.status).toBe('出荷済');
      expect(shipped.body.shippedAt).not.toBeNull();
      expect(again.body).toMatchObject({
        code: 'INVALID_STATUS_TRANSITION',
        details: { from: '出荷済', to: '出荷済' },
      });
      // Shipping does not move stock: it was taken when the order was created.
      expect(await stockOf(tea)).toBe(3);
      await request(server()).post('/api/orders/999/ship').expect(404);
      await request(server()).get('/api/orders/999').expect(404);
    });
  });
});
