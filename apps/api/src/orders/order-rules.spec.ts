import { describe, expect, it } from '@jest/globals';
import { formatOrderNumber, likePattern, priceLines } from './order-rules.js';
import { canTransition, ORDER_STATUS, ORDER_STATUSES } from './order-status.js';

describe('formatOrderNumber', () => {
  it('pads the sequence value to six digits', () => {
    expect(formatOrderNumber(1)).toBe('SO-000001');
    expect(formatOrderNumber(123456)).toBe('SO-123456');
    expect(formatOrderNumber(1234567)).toBe('SO-1234567');
  });
});

describe('priceLines', () => {
  const products = new Map([
    [1, { id: 1, price: 980 }],
    [2, { id: 2, price: 2400 }],
  ]);

  it('prices each line at the current price and adds up the total', () => {
    expect(
      priceLines(
        [
          { productId: 2, quantity: 1 },
          { productId: 1, quantity: 3 },
        ],
        products,
      ),
    ).toEqual({
      lines: [
        { productId: 1, quantity: 3, unitPrice: 980, lineAmount: 2940 },
        { productId: 2, quantity: 1, unitPrice: 2400, lineAmount: 2400 },
      ],
      totalAmount: 5340,
    });
  });

  it('merges lines for the same product', () => {
    expect(
      priceLines(
        [
          { productId: 1, quantity: 1 },
          { productId: 1, quantity: 2 },
        ],
        products,
      ).lines,
    ).toEqual([{ productId: 1, quantity: 3, unitPrice: 980, lineAmount: 2940 }]);
  });

  it('fails loudly when a product was not loaded', () => {
    expect(() => priceLines([{ productId: 9, quantity: 1 }], products)).toThrow('Product 9');
  });
});

describe('likePattern', () => {
  it('wraps the text and escapes the LIKE wildcards', () => {
    expect(likePattern('SO-1')).toBe('%SO-1%');
    expect(likePattern('50%_off\\')).toBe('%50\\%\\_off\\\\%');
  });
});

describe('order status', () => {
  it('has the two baseline statuses as Japanese data values', () => {
    expect(ORDER_STATUSES).toEqual(['受付', '出荷済']);
  });

  it('allows only 受付 → 出荷済', () => {
    expect(canTransition(ORDER_STATUS.received, ORDER_STATUS.shipped)).toBe(true);
    expect(canTransition(ORDER_STATUS.shipped, ORDER_STATUS.shipped)).toBe(false);
    expect(canTransition(ORDER_STATUS.shipped, ORDER_STATUS.received)).toBe(false);
    expect(canTransition(ORDER_STATUS.received, ORDER_STATUS.received)).toBe(false);
  });
});
