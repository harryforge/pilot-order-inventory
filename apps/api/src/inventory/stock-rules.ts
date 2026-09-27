/** A request to take `quantity` units of a product out of stock. */
export interface StockRequest {
  productId: number;
  quantity: number;
}

export interface StockShortage {
  productId: number;
  requested: number;
  available: number;
}

/**
 * Adds up requests for the same product, so an order with two lines for one product is
 * checked against its stock once. The result is sorted by product id: rows are locked in
 * this order, which prevents deadlocks between concurrent orders.
 */
export function mergeRequests(requests: readonly StockRequest[]): StockRequest[] {
  const totals = new Map<number, number>();
  for (const { productId, quantity } of requests) {
    totals.set(productId, (totals.get(productId) ?? 0) + quantity);
  }
  return [...totals.entries()]
    .map(([productId, quantity]) => ({ productId, quantity }))
    .sort((a, b) => a.productId - b.productId);
}

/** Lists every request that the available stock cannot cover. Empty when all fit. */
export function findShortages(
  requests: readonly StockRequest[],
  available: ReadonlyMap<number, number>,
): StockShortage[] {
  return mergeRequests(requests)
    .map(({ productId, quantity }) => ({
      productId,
      requested: quantity,
      available: available.get(productId) ?? 0,
    }))
    .filter((line) => line.requested > line.available);
}
