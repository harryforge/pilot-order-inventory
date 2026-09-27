import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory } from 'vue-router';
import App from './App.vue';
import { createAppRouter } from './router';
import { fakeApi } from './testing/helpers';

describe('App', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('highlights the current section, also on its detail pages', async () => {
    fakeApi({ 'GET /api/health': [200, { status: 'ok', database: 'up' }] });
    const router = createAppRouter(createMemoryHistory());
    await router.push('/inventory/3');
    await router.isReady();

    const wrapper = mount(App, { global: { plugins: [router] } });
    await flushPromises();

    expect(wrapper.get('[aria-current="page"]').text()).toBe('Inventory');
    expect(wrapper.text()).toContain('受注・在庫管理');
  });

  it('opens the order list from the home page', async () => {
    const router = createAppRouter(createMemoryHistory());
    await router.push('/');
    expect(router.currentRoute.value.fullPath).toBe('/orders');
  });
});
