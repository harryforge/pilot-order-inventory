import { apiRequest } from '../../shared/http';
import type { SalesStatus } from '../products/api';

export interface StockLevel {
  productId: number;
  sku: string;
  name: string;
  salesStatus: SalesStatus;
  quantity: number;
  updatedAt: string;
}

export type MovementType = 'in' | 'out';
export type MovementReason = 'goods_in' | 'goods_out' | 'order';

export const MOVEMENT_REASON_LABELS: Record<MovementReason, string> = {
  goods_in: 'Goods in',
  goods_out: 'Goods out',
  order: 'Order',
};

export interface StockMovement {
  id: number;
  productId: number;
  type: MovementType;
  reason: MovementReason;
  quantity: number;
  balanceAfter: number;
  orderId: number | null;
  note: string | null;
  createdAt: string;
}

export interface MovementInput {
  productId: number;
  quantity: number;
  note?: string;
}

/** Shortage details of an `INSUFFICIENT_STOCK` error. */
export interface StockShortage {
  productId: number;
  requested: number;
  available: number;
}

export function listStock(): Promise<StockLevel[]> {
  return apiRequest('/inventory');
}

export function getStock(productId: number): Promise<StockLevel> {
  return apiRequest(`/inventory/${productId}`);
}

export function listMovements(productId: number): Promise<StockMovement[]> {
  return apiRequest(`/inventory/${productId}/movements`);
}

export function recordMovement(type: MovementType, input: MovementInput): Promise<StockMovement> {
  const path = type === 'in' ? '/inventory/goods-in' : '/inventory/goods-out';
  return apiRequest(path, { method: 'POST', body: input });
}
