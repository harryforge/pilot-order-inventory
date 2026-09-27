import { afterEach, describe, expect, it } from 'vitest';
import { vi } from 'vitest';
import { fakeApi } from '../testing/helpers';
import { formatDateTime, formatYen } from './format';
import { ApiError, apiRequest, errorMessage, toQuery } from './http';

describe('apiRequest', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends JSON and returns the parsed response', async () => {
    const api = fakeApi({ 'POST /api/things': [201, { id: 1 }] });

    await expect(apiRequest('/things', { method: 'POST', body: { a: 1 } })).resolves.toEqual({ id: 1 });
    expect(api.calls).toEqual([{ route: 'POST /api/things', body: { a: 1 } }]);
  });

  it('turns an error response into an ApiError with the code and details', async () => {
    fakeApi({
      'GET /api/things': [409, { message: 'Not enough stock', code: 'INSUFFICIENT_STOCK', details: [1] }],
    });

    const error = await apiRequest('/things').catch((err: unknown) => err);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 409,
      message: 'Not enough stock',
      code: 'INSUFFICIENT_STOCK',
      details: [1],
    });
  });

  it('joins validation messages and falls back to the HTTP status', async () => {
    fakeApi({ 'GET /api/a': [400, { message: ['sku is empty', 'price is negative'] }] });
    await expect(apiRequest('/a')).rejects.toThrow('sku is empty; price is negative');

    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 502, json: async () => { throw new Error('not json'); } })));
    await expect(apiRequest('/b')).rejects.toThrow('HTTP 502');
  });
});

describe('toQuery', () => {
  it('keeps only non-empty, trimmed values', () => {
    expect(toQuery({ orderNumber: ' SO-1 ', customer: '', status: undefined })).toBe('?orderNumber=SO-1');
    expect(toQuery({ customer: '   ' })).toBe('');
  });
});

describe('formatting', () => {
  it('formats yen and Japan time', () => {
    expect(formatYen(1280)).toMatch(/1,280$/);
    expect(formatDateTime('2026-09-27T00:00:00Z')).toContain('2026');
    expect(formatDateTime('2026-09-27T00:00:00Z')).toContain('9:00');
  });

  it('reads the message of any thrown value', () => {
    expect(errorMessage(new Error('boom'))).toBe('boom');
    expect(errorMessage('plain')).toBe('plain');
  });
});
