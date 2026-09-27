import { describe, expect, it } from '@jest/globals';
import { PHONE_PATTERN } from '../customers/customer.dto.js';
import { generateSeedData, SEED_COUNTS } from './seed-data.js';
import { SeededRandom } from './random.js';

describe('generateSeedData', () => {
  const now = new Date('2026-09-27T00:00:00Z');
  const data = generateSeedData(now);

  it('creates about 50 products, 20 customers and 100 orders (D-09 F6)', () => {
    expect(data.products).toHaveLength(SEED_COUNTS.products);
    expect(data.customers).toHaveLength(SEED_COUNTS.customers);
    expect(data.orders).toHaveLength(SEED_COUNTS.orders);
    expect(SEED_COUNTS).toEqual({ products: 50, customers: 20, orders: 100 });
  });

  it('is deterministic for the same seed and date', () => {
    expect(generateSeedData(now)).toEqual(data);
    expect(generateSeedData(now, 1)).not.toEqual(data);
  });

  it('gives products unique SKUs, whole-yen prices and both sales statuses', () => {
    const skus = new Set(data.products.map((product) => product.sku));
    expect(skus.size).toBe(SEED_COUNTS.products);
    for (const product of data.products) {
      expect(Number.isInteger(product.price)).toBe(true);
      expect(product.price).toBeGreaterThan(0);
    }
    expect(data.products.filter((p) => p.salesStatus === 'discontinued')).toHaveLength(3);
  });

  it('uses only fictional addresses and unused phone numbers that pass validation', () => {
    for (const customer of data.customers) {
      expect(customer.address).toContain('サンプル市');
      expect(customer.phone).toMatch(/-0000-\d{4}$/);
      expect(customer.phone).toMatch(PHONE_PATTERN);
    }
    expect(new Set(data.customers.map((c) => c.name)).size).toBe(SEED_COUNTS.customers);
  });

  it('plans orders that the stock can cover, only for products on sale', () => {
    const stock = data.products.map((product) => product.openingStock);
    for (const order of data.orders) {
      expect(order.lines.length).toBeGreaterThanOrEqual(1);
      expect(order.lines.length).toBeLessThanOrEqual(4);
      expect(new Set(order.lines.map((line) => line.product)).size).toBe(order.lines.length);
      for (const line of order.lines) {
        expect(data.products[line.product].salesStatus).toBe('on_sale');
        stock[line.product] -= line.quantity;
      }
    }
    expect(Math.min(...stock)).toBeGreaterThanOrEqual(0);
  });

  it('spreads the orders over the last months, oldest ones shipped after ordering', () => {
    const times = data.orders.map((order) => order.orderedAt.getTime());
    expect([...times].sort((a, b) => a - b)).toEqual(times);
    expect(times[0]).toBeGreaterThan(data.openingStockAt.getTime());
    expect(times.at(-1)).toBeLessThanOrEqual(now.getTime());
    const shipped = data.orders.filter((order) => order.shippedAt !== null);
    expect(shipped).toHaveLength(60);
    for (const order of shipped) {
      expect(order.shippedAt!.getTime()).toBeGreaterThan(order.orderedAt.getTime());
    }
  });
});

describe('SeededRandom', () => {
  it('repeats the same sequence for the same seed and stays in range', () => {
    const a = new SeededRandom(7);
    const b = new SeededRandom(7);
    const values = Array.from({ length: 100 }, () => a.int(1, 6));
    expect(values).toEqual(Array.from({ length: 100 }, () => b.int(1, 6)));
    expect(Math.min(...values)).toBe(1);
    expect(Math.max(...values)).toBe(6);
    expect(new SeededRandom(7).pick(['x'])).toBe('x');
  });
});
