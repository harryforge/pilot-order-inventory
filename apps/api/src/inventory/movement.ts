/** Direction of a stock movement. */
export const MOVEMENT_TYPES = ['in', 'out'] as const;
export type MovementType = (typeof MOVEMENT_TYPES)[number];

/**
 * Why the stock moved. `goods_in` / `goods_out` are manual warehouse entries; `order` is the
 * deduction made when an order is created. New reasons (for example returns) are added here
 * and in the `ck_stock_movements_reason` check constraint.
 */
export const MOVEMENT_REASONS = ['goods_in', 'goods_out', 'order'] as const;
export type MovementReason = (typeof MOVEMENT_REASONS)[number];
