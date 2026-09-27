import { apiRequest, toQuery } from '../../shared/http';
import type { Customer } from '../customers/api';
import type { Product } from '../products/api';

/** Status values are Japanese data values and are shown as they are. */
export const ORDER_STATUS = { received: '受付', shipped: '出荷済' } as const;
export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];

/** CSS modifier per status. */
export const ORDER_STATUS_CLASS: Record<OrderStatus, string> = {
  受付: 'received',
  出荷済: 'shipped',
};

export interface OrderLine {
  id: number;
  productId: number;
  quantity: number;
  unitPrice: number;
  lineAmount: number;
  product: Pick<Product, 'id' | 'sku' | 'name'>;
}

export interface Order {
  id: number;
  orderNumber: string;
  customerId: number;
  customer: Pick<Customer, 'id' | 'name'>;
  status: OrderStatus;
  totalAmount: number;
  orderedAt: string;
  shippedAt: string | null;
}

export interface OrderDetail extends Order {
  lines: OrderLine[];
}

export interface OrderFilters {
  orderNumber?: string;
  customer?: string;
}

export interface NewOrder {
  customerId: number;
  lines: { productId: number; quantity: number }[];
}

export function listOrders(filters: OrderFilters = {}): Promise<Order[]> {
  return apiRequest(`/orders${toQuery({ ...filters })}`);
}

export function getOrder(id: number): Promise<OrderDetail> {
  return apiRequest(`/orders/${id}`);
}

export function createOrder(order: NewOrder): Promise<OrderDetail> {
  return apiRequest('/orders', { method: 'POST', body: order });
}

export function shipOrder(id: number): Promise<OrderDetail> {
  return apiRequest(`/orders/${id}/ship`, { method: 'POST' });
}
