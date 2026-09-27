import { describe, expect, it } from '@jest/globals';
import { HttpStatus } from '@nestjs/common';
import { customerNotFound, DomainError, ERROR_CODES, productNotFound } from './domain-error.js';
import { definedOnly } from './defined-only.js';
import { isUniqueViolation } from './postgres-errors.js';

describe('DomainError', () => {
  it('keeps the NestJS body shape and adds a code and details', () => {
    const error = new DomainError(HttpStatus.CONFLICT, ERROR_CODES.insufficientStock, 'Not enough', [
      { productId: 1 },
    ]);

    expect(error.getStatus()).toBe(409);
    expect(error.getResponse()).toEqual({
      statusCode: 409,
      code: 'INSUFFICIENT_STOCK',
      message: 'Not enough',
      details: [{ productId: 1 }],
    });
  });

  it('leaves details out when there are none', () => {
    expect(productNotFound(4).getResponse()).toEqual({
      statusCode: 404,
      code: 'PRODUCT_NOT_FOUND',
      message: 'Product 4 not found',
    });
    expect(customerNotFound(5).getStatus()).toBe(404);
  });
});

describe('isUniqueViolation', () => {
  const violation = { driverError: { code: '23505', constraint: 'uq_products_sku' } };

  it('matches a unique violation on the given constraint', () => {
    expect(isUniqueViolation(violation, 'uq_products_sku')).toBe(true);
  });

  it('ignores other constraints, other errors and non-objects', () => {
    expect(isUniqueViolation(violation, 'uq_other')).toBe(false);
    expect(isUniqueViolation({ driverError: { code: '23503' } }, 'uq_products_sku')).toBe(false);
    expect(isUniqueViolation(new Error('boom'), 'uq_products_sku')).toBe(false);
    expect(isUniqueViolation(null, 'uq_products_sku')).toBe(false);
  });
});

describe('definedOnly', () => {
  it('drops undefined properties and keeps null, zero and empty strings', () => {
    expect(definedOnly({ a: undefined, b: null, c: 0, d: '' })).toEqual({ b: null, c: 0, d: '' });
    expect(Object.keys(definedOnly({ a: undefined }))).toEqual([]);
  });
});
