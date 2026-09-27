/**
 * Order statuses. The values are Japanese because they are data values shown as they are
 * (D-09 §4): 受付 = received, 出荷済 = shipped. New statuses (for example a cancelled status)
 * are added here, in ORDER_TRANSITIONS and in the `ck_orders_status` check constraint.
 */
export const ORDER_STATUS = {
  received: '受付',
  shipped: '出荷済',
} as const;

export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];

export const ORDER_STATUSES: readonly OrderStatus[] = Object.values(ORDER_STATUS);

/** Allowed status changes: from a status to the statuses it may move to. */
export const ORDER_TRANSITIONS: Readonly<Record<OrderStatus, readonly OrderStatus[]>> = {
  [ORDER_STATUS.received]: [ORDER_STATUS.shipped],
  [ORDER_STATUS.shipped]: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_TRANSITIONS[from].includes(to);
}
