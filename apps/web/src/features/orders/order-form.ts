import type { StockShortage } from '../inventory/api';

/** One editable line of the new-order form. `productId` is null until a product is chosen. */
export interface DraftLine {
  key: number;
  productId: number | null;
  quantity: number;
}

export interface ProductOption {
  id: number;
  sku: string;
  name: string;
  price: number;
  stock: number;
}

/** Sum of price × quantity over the lines that have a product. */
export function draftTotal(lines: readonly DraftLine[], products: ReadonlyMap<number, ProductOption>): number {
  return lines.reduce((sum, line) => {
    const product = line.productId === null ? undefined : products.get(line.productId);
    return product ? sum + product.price * line.quantity : sum;
  }, 0);
}

/** The lines to send: only lines with a product and a positive whole quantity. */
export function completeLines(lines: readonly DraftLine[]): { productId: number; quantity: number }[] {
  return lines
    .filter((line) => line.productId !== null && Number.isInteger(line.quantity) && line.quantity > 0)
    .map((line) => ({ productId: line.productId as number, quantity: line.quantity }));
}

/** Message per product id for the shortages of an `INSUFFICIENT_STOCK` error. */
export function shortageMessages(shortages: readonly StockShortage[]): Map<number, string> {
  return new Map(
    shortages.map((shortage) => [
      shortage.productId,
      shortage.available === 0
        ? 'Out of stock.'
        : `Only ${shortage.available} in stock (${shortage.requested} ordered).`,
    ]),
  );
}
