import { HttpException, HttpStatus } from '@nestjs/common';

/** Stable, machine-readable error codes. The web app and tests match on these, not on messages. */
export const ERROR_CODES = {
  productNotFound: 'PRODUCT_NOT_FOUND',
  skuAlreadyExists: 'SKU_ALREADY_EXISTS',
  insufficientStock: 'INSUFFICIENT_STOCK',
  customerNotFound: 'CUSTOMER_NOT_FOUND',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

export interface DomainErrorBody {
  statusCode: number;
  code: ErrorCode;
  message: string;
  details?: unknown;
}

/**
 * An expected business error. The response body keeps the NestJS shape (`statusCode`, `message`)
 * and adds a stable `code` and optional `details`.
 */
export class DomainError extends HttpException {
  constructor(status: HttpStatus, code: ErrorCode, message: string, details?: unknown) {
    const body: DomainErrorBody = { statusCode: status, code, message };
    super(details === undefined ? body : { ...body, details }, status);
  }
}

export function productNotFound(productId: number): DomainError {
  return new DomainError(
    HttpStatus.NOT_FOUND,
    ERROR_CODES.productNotFound,
    `Product ${productId} not found`,
  );
}

export function customerNotFound(customerId: number): DomainError {
  return new DomainError(
    HttpStatus.NOT_FOUND,
    ERROR_CODES.customerNotFound,
    `Customer ${customerId} not found`,
  );
}
