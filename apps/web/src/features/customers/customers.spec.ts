import { flushPromises } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fakeApi, mountRoute } from '../../testing/helpers';
import type { Customer } from './api';

const customer: Customer = {
  id: 1,
  name: 'Kasou Shoten',
  address: '1-2-3 Kasou, Minato, Tokyo',
  phone: '03-0000-0001',
  createdAt: '2026-09-01T00:00:00Z',
};

describe('customer screens', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('lists the customers', async () => {
    fakeApi({ 'GET /api/customers': [200, [customer]] });

    const { wrapper } = await mountRoute('/customers');

    expect(wrapper.get('[data-test="customer-table"]').text()).toContain('03-0000-0001');
  });

  it('shows one customer', async () => {
    fakeApi({ 'GET /api/customers/1': [200, customer] });

    const { wrapper } = await mountRoute('/customers/1');

    expect(wrapper.get('[data-test="customer-detail"]').text()).toContain('Kasou');
  });

  it('creates a customer and opens it', async () => {
    const api = fakeApi({ 'POST /api/customers': [201, customer], 'GET /api/customers/1': [200, customer] });
    const { wrapper, router } = await mountRoute('/customers/new');

    await wrapper.get('input[name="name"]').setValue(customer.name);
    await wrapper.get('input[name="address"]').setValue(customer.address);
    await wrapper.get('input[name="phone"]').setValue(customer.phone);
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    expect(api.calls[0].body).toEqual({ name: customer.name, address: customer.address, phone: customer.phone });
    expect(router.currentRoute.value.fullPath).toBe('/customers/1');
  });

  it('shows the api validation message', async () => {
    fakeApi({ 'POST /api/customers': [400, { message: ['phone must contain digits'] }] });
    const { wrapper } = await mountRoute('/customers/new');

    await wrapper.get('form').trigger('submit');
    await flushPromises();

    expect(wrapper.get('[data-test="form-error"]').text()).toBe('phone must contain digits');
  });
});
