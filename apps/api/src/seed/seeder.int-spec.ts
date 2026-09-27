import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { createTestApp, type TestApp, truncateAll } from '../testing/test-app.js';
import { generateSeedData } from './seed-data.js';
import { runSeed, SeedRefusedError } from './seeder.js';

describe('Seed (integration)', () => {
  let ctx: TestApp;
  const data = generateSeedData(new Date('2026-09-27T00:00:00Z'));

  async function scalar(sql: string): Promise<unknown> {
    const [row] = (await ctx.dataSource.query(sql)) as { v: unknown }[];
    return row.v;
  }

  beforeAll(async () => {
    ctx = await createTestApp();
    await truncateAll(ctx.dataSource);
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  it('loads 50 products, 20 customers and 100 orders through the real services', async () => {
    const summary = await runSeed(ctx.app, data, { reset: false });

    expect(summary).toEqual({ products: 50, customers: 20, orders: 100, shipped: 60 });
    expect(await scalar('SELECT count(*)::int AS v FROM products')).toBe(50);
    expect(await scalar('SELECT count(*)::int AS v FROM customers')).toBe(20);
    expect(await scalar('SELECT count(*)::int AS v FROM orders')).toBe(100);
    expect(await scalar("SELECT count(*)::int AS v FROM orders WHERE status = '出荷済'")).toBe(60);
    expect(await scalar("SELECT max(order_number) AS v FROM orders")).toBe('SO-000100');
  });

  it('leaves the stock equal to the movement history, never negative', async () => {
    const mismatches = await ctx.dataSource.query(`
      SELECT item.product_id
      FROM inventory_items AS item
      LEFT JOIN stock_movements AS m ON m.product_id = item.product_id
      GROUP BY item.product_id, item.quantity
      HAVING item.quantity <> coalesce(sum(CASE m.type WHEN 'in' THEN m.quantity ELSE -m.quantity END), 0)
          OR item.quantity < 0
    `);
    expect(mismatches).toEqual([]);
    expect(
      await scalar("SELECT count(*)::int AS v FROM stock_movements WHERE reason = 'order'"),
    ).toBe(await scalar('SELECT count(*)::int AS v FROM order_lines'));
  });

  it('dates orders and their movements in the planned period', async () => {
    const [first] = (await ctx.dataSource.query(
      "SELECT o.ordered_at, m.created_at FROM orders o JOIN stock_movements m ON m.order_id = o.id WHERE o.order_number = 'SO-000001' LIMIT 1",
    )) as { ordered_at: Date; created_at: Date }[];
    expect(first.ordered_at.toISOString()).toBe(data.orders[0].orderedAt.toISOString());
    expect(first.created_at.toISOString()).toBe(data.orders[0].orderedAt.toISOString());
  });

  it('refuses to run on a database with data unless reset is asked for', async () => {
    await expect(runSeed(ctx.app, data, { reset: false })).rejects.toBeInstanceOf(SeedRefusedError);

    const summary = await runSeed(ctx.app, data, { reset: true });

    expect(summary.orders).toBe(100);
    expect(await scalar('SELECT count(*)::int AS v FROM products')).toBe(50);
    expect(await scalar('SELECT min(order_number) AS v FROM orders')).toBe('SO-000001');
  });
});
