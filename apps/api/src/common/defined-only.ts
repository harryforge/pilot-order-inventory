/**
 * Drops properties whose value is `undefined`. DTO classes declare every optional field, so a
 * PATCH body without `sku` still has `sku: undefined`; merging it would erase the stored value.
 */
export function definedOnly<T extends object>(value: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, fieldValue]) => fieldValue !== undefined),
  ) as Partial<T>;
}
