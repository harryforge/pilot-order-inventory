import { flushPromises } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fakeApi, mountRoute } from '../../testing/helpers';
import type { Product } from './api';

const tea: Product = {
  id: 1,
  sku: 'TEA-001',
  name: 'Green tea 100 g',
  price: 980,
  salesStatus: 'on_sale',
  createdAt: '2026-09-01T00:00:00Z',
  updatedAt: '2026-09-01T00:00:00Z',
};

describe('product screens', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('lists the products with price and sales status', async () => {
    fakeApi({ 'GET /api/products': [200, [tea, { ...tea, id: 2, sku: 'TEA-002', salesStatus: 'discontinued' }]] });

    const { wrapper } = await mountRoute('/products');

    const rows = wrapper.findAll('[data-test="product-table"] tbody tr');
    expect(rows).toHaveLength(2);
    expect(rows[0].text()).toContain('TEA-001');
    expect(rows[0].text()).toContain('980');
    expect(rows[0].text()).toContain('On sale');
    expect(rows[1].text()).toContain('Discontinued');
  });

  it('shows an error when the list cannot be loaded', async () => {
    fakeApi({ 'GET /api/products': [500, { message: 'Internal server error' }] });

    const { wrapper } = await mountRoute('/products');

    expect(wrapper.get('[data-test="load-error"]').text()).toContain('Internal server error');
  });

  it('shows one product', async () => {
    fakeApi({ 'GET /api/products/1': [200, tea] });

    const { wrapper } = await mountRoute('/products/1');

    expect(wrapper.get('[data-test="product-detail"]').text()).toContain('TEA-001');
  });

  it('creates a product and opens it', async () => {
    const api = fakeApi({ 'POST /api/products': [201, tea], 'GET /api/products/1': [200, tea] });
    const { wrapper, router } = await mountRoute('/products/new');

    await wrapper.get('input[name="sku"]').setValue('TEA-001');
    await wrapper.get('input[name="name"]').setValue('Green tea 100 g');
    await wrapper.get('input[name="price"]').setValue('980');
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    expect(api.calls[0]).toEqual({
      route: 'POST /api/products',
      body: { sku: 'TEA-001', name: 'Green tea 100 g', price: 980, salesStatus: 'on_sale' },
    });
    expect(router.currentRoute.value.fullPath).toBe('/products/1');
  });

  it('explains a duplicate SKU', async () => {
    fakeApi({ 'POST /api/products': [409, { code: 'SKU_ALREADY_EXISTS', message: 'taken' }] });
    const { wrapper } = await mountRoute('/products/new');

    await wrapper.get('form').trigger('submit');
    await flushPromises();

    expect(wrapper.get('[data-test="form-error"]').text()).toBe(
      'This SKU is already used by another product.',
    );
  });

  it('loads the product into the edit form and saves the changes', async () => {
    const api = fakeApi({
      'GET /api/products/1': [200, tea],
      'PATCH /api/products/1': [200, { ...tea, price: 1080 }],
    });
    const { wrapper, router } = await mountRoute('/products/1/edit');

    expect((wrapper.get('input[name="sku"]').element as HTMLInputElement).value).toBe('TEA-001');
    await wrapper.get('input[name="price"]').setValue('1080');
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    expect(api.calls.at(-2)).toEqual({
      route: 'PATCH /api/products/1',
      body: { sku: 'TEA-001', name: 'Green tea 100 g', price: 1080, salesStatus: 'on_sale' },
    });
    expect(router.currentRoute.value.fullPath).toBe('/products/1');
  });
});
