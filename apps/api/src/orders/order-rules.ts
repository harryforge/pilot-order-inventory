import { mergeRequests, type StockRequest } from '../inventory/stock-rules.js';

export interface PricedProduct {
  id: number;
  price: number;
}

export interface PricedLine {
  productId: number;
  quantity: number;
  unitPrice: number;
  lineAmount: number;
}

/** Order number shown to users: `SO-` plus the sequence value padded to six digits. */
export function formatOrderNumber(sequenceValue: number): string {
  return `SO-${String(sequenceValue).padStart(6, '0')}`;
}

/**
 * Turns the requested lines into order lines with prices: one line per product (quantities of
 * the same product are added up), priced at the current product price.
 */
export function priceLines(
  lines: readonly StockRequest[],
  products: ReadonlyMap<number, PricedProduct>,
): { lines: PricedLine[]; totalAmount: number } {
  const priced = mergeRequests(lines).map(({ productId, quantity }) => {
    const product = products.get(productId);
    if (!product) {
      throw new Error(`Product ${productId} was not loaded`);
    }
    return { productId, quantity, unitPrice: product.price, lineAmount: product.price * quantity };
  });
  return { lines: priced, totalAmount: priced.reduce((sum, line) => sum + line.lineAmount, 0) };
}

/** Escapes `%`, `_` and `\` so user text matches literally inside an ILIKE pattern. */
export function likePattern(text: string): string {
  return `%${text.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
}
