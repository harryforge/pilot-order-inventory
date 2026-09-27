import { flushPromises } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fakeApi, mountRoute } from '../../testing/helpers';
import type { Order, OrderDetail } from './api';
import { completeLines, draftTotal, shortageMessages } from './order-form';

const order: Order = {
  id: 7,
  orderNumber: 'SO-000007',
  customerId: 1,
  customer: { id: 1, name: 'さくら商店' },
  status: '受付',
  totalAmount: 5340,
  orderedAt: '2026-09-01T00:00:00Z',
  shippedAt: null,
};
const detail: OrderDetail = {
  ...order,
  lines: [
    { id: 1, productId: 1, quantity: 3, unitPrice: 980, lineAmount: 2940, product: { id: 1, sku: 'TEA-001', name: '煎茶（小）' } },
    { id: 2, productId: 2, quantity: 1, unitPrice: 2400, lineAmount: 2400, product: { id: 2, sku: 'RCE-009', name: '白米（小）' } },
  ],
};
const formData = {
  'GET /api/customers': [200, [{ id: 1, name: 'さくら商店', address: 'x', phone: '03-0000-0001', createdAt: '' }]],
  'GET /api/products': [
    200,
    [
      { id: 1, sku: 'TEA-001', name: '煎茶（小）', price: 980, salesStatus: 'on_sale' },
      { id: 2, sku: 'RCE-009', name: '白米（小）', price: 2400, salesStatus: 'on_sale' },
      { id: 3, sku: 'OLD-001', name: 'Old', price: 100, salesStatus: 'discontinued' },
    ],
  ],
  'GET /api/inventory': [
    200,
    [
      { productId: 1, quantity: 10 },
      { productId: 2, quantity: 1 },
      { productId: 3, quantity: 5 },
    ],
  ],
} satisfies Record<string, [number, unknown]>;

describe('order list', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows the orders with number, customer, status and total', async () => {
    fakeApi({ 'GET /api/orders': [200, [order, { ...order, id: 8, orderNumber: 'SO-000008', status: '出荷済' }]] });

    const { wrapper } = await mountRoute('/orders');

    const rows = wrapper.findAll('[data-test="order-table"] tbody tr');
    expect(rows).toHaveLength(2);
    expect(rows[0].text()).toContain('SO-000007');
    expect(rows[0].text()).toContain('さくら商店');
    expect(rows[0].text()).toContain('5,340');
    expect(rows[0].find('.status--received').text()).toBe('受付');
    expect(rows[1].find('.status--shipped').text()).toBe('出荷済');
    expect(wrapper.get('[data-test="order-count"]').text()).toBe('2 orders');
  });

  it('puts the search in the URL and sends it to the api', async () => {
    const api = fakeApi({
      'GET /api/orders': [200, [order]],
      'GET /api/orders?orderNumber=SO-0&customer=%E3%81%95%E3%81%8F%E3%82%89': [200, []],
    });
    const { wrapper, router } = await mountRoute('/orders');

    await wrapper.get('input[name="orderNumber"]').setValue(' SO-0 ');
    await wrapper.get('input[name="customer"]').setValue('さくら');
    await wrapper.get('[data-test="order-search"]').trigger('submit');
    await flushPromises();

    expect(router.currentRoute.value.query).toEqual({ orderNumber: 'SO-0', customer: 'さくら' });
    expect(api.calls.at(-1)?.route).toBe(
      'GET /api/orders?orderNumber=SO-0&customer=%E3%81%95%E3%81%8F%E3%82%89',
    );
    expect(wrapper.get('[data-test="no-orders"]').text()).toBe('No orders found.');
  });

  it('runs the search from the URL when the page opens, and clears it', async () => {
    const api = fakeApi({
      'GET /api/orders?customer=kasou': [200, [order]],
      'GET /api/orders': [200, []],
    });
    const { wrapper, router } = await mountRoute('/orders?customer=kasou');

    expect(api.calls[0].route).toBe('GET /api/orders?customer=kasou');
    expect((wrapper.get('input[name="customer"]').element as HTMLInputElement).value).toBe('kasou');

    await wrapper.get('[data-test="clear-search"]').trigger('click');
    await flushPromises();

    expect(router.currentRoute.value.fullPath).toBe('/orders');
    expect(api.calls.at(-1)?.route).toBe('GET /api/orders');
  });
});

describe('order detail', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows the lines and the total, and ships a received order', async () => {
    const api = fakeApi({
      'GET /api/orders/7': [200, detail],
      'POST /api/orders/7/ship': [201, { ...detail, status: '出荷済', shippedAt: '2026-09-02T00:00:00Z' }],
    });
    const { wrapper } = await mountRoute('/orders/7');

    expect(wrapper.findAll('[data-test="order-lines"] tbody tr')).toHaveLength(2);
    expect(wrapper.get('[data-test="order-total"]').text()).toContain('5,340');
    expect(wrapper.get('[data-test="order-status"]').text()).toBe('受付');

    await wrapper.get('[data-test="ship-button"]').trigger('click');
    await flushPromises();

    expect(api.calls.at(-1)?.route).toBe('POST /api/orders/7/ship');
    expect(wrapper.get('[data-test="order-status"]').text()).toBe('出荷済');
    expect(wrapper.find('[data-test="ship-button"]').exists()).toBe(false);
  });

  it('shows the error when shipping is refused', async () => {
    fakeApi({
      'GET /api/orders/7': [200, detail],
      'POST /api/orders/7/ship': [409, { code: 'INVALID_STATUS_TRANSITION', message: 'An order in status 出荷済 cannot move to 出荷済' }],
    });
    const { wrapper } = await mountRoute('/orders/7');

    await wrapper.get('[data-test="ship-button"]').trigger('click');
    await flushPromises();

    expect(wrapper.get('[data-test="form-error"]').text()).toContain('cannot move');
  });
});

describe('new order form', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('offers only products on sale and places a multi-line order', async () => {
    const api = fakeApi({ ...formData, 'POST /api/orders': [201, detail], 'GET /api/orders/7': [200, detail] });
    const { wrapper, router } = await mountRoute('/orders/new');

    const options = wrapper.findAll('select[name="productId-0"] option').map((o) => o.text());
    expect(options.join()).not.toContain('OLD-001');
    await wrapper.get('select[name="customerId"]').setValue('1');
    await wrapper.get('select[name="productId-0"]').setValue('1');
    await wrapper.get('input[name="quantity-0"]').setValue('3');
    await wrapper.get('[data-test="add-line"]').trigger('click');
    await wrapper.get('select[name="productId-1"]').setValue('2');
    expect(wrapper.get('[data-test="draft-total"]').text()).toContain('5,340');

    await wrapper.get('form').trigger('submit');
    await flushPromises();

    expect(api.calls.find((call) => call.route === 'POST /api/orders')?.body).toEqual({
      customerId: 1,
      lines: [
        { productId: 1, quantity: 3 },
        { productId: 2, quantity: 1 },
      ],
    });
    expect(router.currentRoute.value.fullPath).toBe('/orders/7');
  });

  it('shows the shortage next to the line and keeps the form', async () => {
    fakeApi({
      ...formData,
      'POST /api/orders': [409, { code: 'INSUFFICIENT_STOCK', message: 'Not enough stock', details: [{ productId: 2, requested: 4, available: 1 }] }],
    });
    const { wrapper, router } = await mountRoute('/orders/new');

    await wrapper.get('select[name="customerId"]').setValue('1');
    await wrapper.get('select[name="productId-0"]').setValue('2');
    await wrapper.get('input[name="quantity-0"]').setValue('4');
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    expect(wrapper.get('[data-test="line-error"]').text()).toBe('Only 1 in stock (4 ordered).');
    expect(wrapper.get('[data-test="form-error"]').text()).toContain('Nothing was ordered');
    expect(router.currentRoute.value.fullPath).toBe('/orders/new');
  });

  it('asks for a customer and a product before sending', async () => {
    const api = fakeApi({ ...formData });
    const { wrapper } = await mountRoute('/orders/new');

    await wrapper.get('form').trigger('submit');
    await flushPromises();

    expect(wrapper.get('[data-test="form-error"]').text()).toBe('Choose a customer and at least one product.');
    expect(api.calls.some((call) => call.route.startsWith('POST'))).toBe(false);
  });
});

describe('order form helpers', () => {
  const products = new Map([
    [1, { id: 1, sku: 'A', name: 'A', price: 100, stock: 5 }],
    [2, { id: 2, sku: 'B', name: 'B', price: 250, stock: 0 }],
  ]);

  it('totals the lines that have a product', () => {
    expect(
      draftTotal(
        [
          { key: 1, productId: 1, quantity: 3 },
          { key: 2, productId: null, quantity: 9 },
          { key: 3, productId: 2, quantity: 2 },
        ],
        products,
      ),
    ).toBe(800);
  });

  it('sends only complete lines', () => {
    expect(
      completeLines([
        { key: 1, productId: 1, quantity: 2 },
        { key: 2, productId: null, quantity: 1 },
        { key: 3, productId: 2, quantity: 0 },
        { key: 4, productId: 2, quantity: 1.5 },
      ]),
    ).toEqual([{ productId: 1, quantity: 2 }]);
  });

  it('words the shortage for each product', () => {
    expect(
      shortageMessages([
        { productId: 1, requested: 6, available: 5 },
        { productId: 2, requested: 1, available: 0 },
      ]),
    ).toEqual(
      new Map([
        [1, 'Only 5 in stock (6 ordered).'],
        [2, 'Out of stock.'],
      ]),
    );
  });
});
