/** Sales status of a product. Only products that are on sale can be ordered. */
export const SALES_STATUSES = ['on_sale', 'discontinued'] as const;

export type SalesStatus = (typeof SALES_STATUSES)[number];
