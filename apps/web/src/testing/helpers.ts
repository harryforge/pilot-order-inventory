import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { vi } from 'vitest';
import { createMemoryHistory, RouterView, type Router } from 'vue-router';
import { createAppRouter } from '../router';

type Reply = [status: number, body: unknown];

export interface FakeApi {
  /** Every request as `METHOD /path`, with the parsed JSON body if there was one. */
  calls: { route: string; body?: unknown }[];
}

/**
 * Replaces `fetch` with a fake api. Keys are `METHOD /api/path?query`; a list of replies is
 * used one per call (the last one repeats). Unknown routes answer 404.
 */
export function fakeApi(routes: Record<string, Reply | Reply[]>): FakeApi {
  const api: FakeApi = { calls: [] };
  const counters = new Map<string, number>();
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      const route = `${init?.method ?? 'GET'} ${url}`;
      api.calls.push({
        route,
        ...(typeof init?.body === 'string' ? { body: JSON.parse(init.body) } : {}),
      });
      const entry = routes[route];
      const replies: Reply[] = entry === undefined ? [[404, {}]] : Array.isArray(entry[0]) ? (entry as Reply[]) : [entry as Reply];
      const index = counters.get(route) ?? 0;
      counters.set(route, index + 1);
      const [status, body] = replies[Math.min(index, replies.length - 1)];
      return { ok: status < 400, status, json: async () => body };
    }),
  );
  return api;
}

/** Mounts the app's router view at `path` and waits for the first data load. */
export async function mountRoute(path: string): Promise<{ wrapper: VueWrapper; router: Router }> {
  const router = createAppRouter(createMemoryHistory());
  await router.push(path);
  await router.isReady();
  const wrapper = mount(RouterView, { global: { plugins: [router] } });
  await flushPromises();
  return { wrapper, router };
}
