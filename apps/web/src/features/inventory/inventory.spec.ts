import { flushPromises } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fakeApi, mountRoute } from '../../testing/helpers';
import type { StockLevel, StockMovement } from './api';

const stock: StockLevel = {
  productId: 3,
  sku: 'RICE-5KG',
  name: 'Rice 5 kg',
  salesStatus: 'on_sale',
  quantity: 12,
  updatedAt: '2026-09-01T00:00:00Z',
};
const received: StockMovement = {
  id: 1,
  productId: 3,
  type: 'in',
  reason: 'goods_in',
  quantity: 12,
  balanceAfter: 12,
  orderId: null,
  note: 'First delivery',
  createdAt: '2026-09-01T00:00:00Z',
};

describe('inventory screens', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('lists the stock and marks empty products', async () => {
    fakeApi({ 'GET /api/inventory': [200, [stock, { ...stock, productId: 4, sku: 'X', quantity: 0 }]] });

    const { wrapper } = await mountRoute('/inventory');

    const rows = wrapper.findAll('[data-test="stock-table"] tbody tr');
    expect(rows[0].text()).toContain('12');
    expect(rows[1].find('.is-empty').text()).toBe('0');
  });

  it('shows the stock and its movement history', async () => {
    fakeApi({
      'GET /api/inventory/3': [200, stock],
      'GET /api/inventory/3/movements': [200, [received]],
    });

    const { wrapper } = await mountRoute('/inventory/3');

    expect(wrapper.get('[data-test="stock-quantity"]').text()).toContain('12');
    const history = wrapper.get('[data-test="movement-table"]').text();
    expect(history).toContain('Goods in');
    expect(history).toContain('+12');
    expect(history).toContain('First delivery');
  });

  it('records goods out and reloads the stock', async () => {
    const api = fakeApi({
      'GET /api/inventory/3': [
        [200, stock],
        [200, { ...stock, quantity: 7 }],
      ],
      'GET /api/inventory/3/movements': [200, [received]],
      'POST /api/inventory/goods-out': [201, { ...received, type: 'out' }],
    });
    const { wrapper } = await mountRoute('/inventory/3');

    await wrapper.get('input[value="out"]').setValue(true);
    await wrapper.get('input[name="quantity"]').setValue('5');
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    expect(api.calls).toContainEqual({
      route: 'POST /api/inventory/goods-out',
      body: { productId: 3, quantity: 5 },
    });
    expect(wrapper.get('[data-test="stock-quantity"]').text()).toContain('7');
  });

  it('explains a shortage', async () => {
    fakeApi({
      'GET /api/inventory/3': [200, stock],
      'GET /api/inventory/3/movements': [200, []],
      'POST /api/inventory/goods-out': [
        409,
        { code: 'INSUFFICIENT_STOCK', message: 'Not enough stock', details: [{ productId: 3, requested: 20, available: 12 }] },
      ],
    });
    const { wrapper } = await mountRoute('/inventory/3');

    await wrapper.get('input[value="out"]').setValue(true);
    await wrapper.get('input[name="quantity"]').setValue('20');
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    expect(wrapper.get('[data-test="form-error"]').text()).toBe(
      'Not enough stock: 20 requested, 12 available.',
    );
  });
});
