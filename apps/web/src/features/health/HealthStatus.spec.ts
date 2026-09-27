import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import HealthStatus from './HealthStatus.vue';

function mockFetch(status: number, body: unknown): void {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({ ok: status < 400, status, json: async () => body }),
  );
}

describe('HealthStatus', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows the api and database status', async () => {
    mockFetch(200, { status: 'ok', database: 'up' });

    const wrapper = mount(HealthStatus);
    expect(wrapper.find('[data-test="health-loading"]').exists()).toBe(true);
    await flushPromises();

    expect(wrapper.get('[data-test="health-status"]').text()).toBe('API: ok, database: up');
  });

  it('shows a degraded status when the database is down', async () => {
    mockFetch(503, { status: 'degraded', database: 'down' });

    const wrapper = mount(HealthStatus);
    await flushPromises();

    expect(wrapper.get('[data-test="health-status"]').text()).toBe(
      'API: degraded, database: down',
    );
  });

  it('shows an error when the api fails', async () => {
    mockFetch(500, {});

    const wrapper = mount(HealthStatus);
    await flushPromises();

    expect(wrapper.get('[data-test="health-error"]').text()).toContain('HTTP 500');
  });
});
