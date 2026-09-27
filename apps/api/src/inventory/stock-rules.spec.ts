import { describe, expect, it } from '@jest/globals';
import { findShortages, mergeRequests } from './stock-rules.js';

describe('mergeRequests', () => {
  it('adds up requests for the same product and sorts by product id', () => {
    expect(
      mergeRequests([
        { productId: 7, quantity: 2 },
        { productId: 3, quantity: 1 },
        { productId: 7, quantity: 5 },
      ]),
    ).toEqual([
      { productId: 3, quantity: 1 },
      { productId: 7, quantity: 7 },
    ]);
  });

  it('returns an empty list for no requests', () => {
    expect(mergeRequests([])).toEqual([]);
  });
});

describe('findShortages', () => {
  const available = new Map([
    [1, 10],
    [2, 3],
  ]);

  it('returns nothing when the stock covers every request, including an exact match', () => {
    expect(
      findShortages(
        [
          { productId: 1, quantity: 10 },
          { productId: 2, quantity: 1 },
        ],
        available,
      ),
    ).toEqual([]);
  });

  it('lists each product that is short, with the requested and available quantities', () => {
    expect(
      findShortages(
        [
          { productId: 1, quantity: 4 },
          { productId: 2, quantity: 4 },
        ],
        available,
      ),
    ).toEqual([{ productId: 2, requested: 4, available: 3 }]);
  });

  it('checks the total of several requests for the same product', () => {
    expect(
      findShortages(
        [
          { productId: 2, quantity: 2 },
          { productId: 2, quantity: 2 },
        ],
        available,
      ),
    ).toEqual([{ productId: 2, requested: 4, available: 3 }]);
  });

  it('treats a product without stock information as having none', () => {
    expect(findShortages([{ productId: 9, quantity: 1 }], available)).toEqual([
      { productId: 9, requested: 1, available: 0 },
    ]);
  });
});
