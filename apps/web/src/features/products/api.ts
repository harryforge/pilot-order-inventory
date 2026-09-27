import { apiRequest } from '../../shared/http';

export const SALES_STATUSES = ['on_sale', 'discontinued'] as const;
export type SalesStatus = (typeof SALES_STATUSES)[number];

export const SALES_STATUS_LABELS: Record<SalesStatus, string> = {
  on_sale: 'On sale',
  discontinued: 'Discontinued',
};

export interface Product {
  id: number;
  sku: string;
  name: string;
  /** Unit price in JPY. */
  price: number;
  salesStatus: SalesStatus;
  createdAt: string;
  updatedAt: string;
}

export type ProductInput = Pick<Product, 'sku' | 'name' | 'price' | 'salesStatus'>;

export function listProducts(): Promise<Product[]> {
  return apiRequest('/products');
}

export function getProduct(id: number): Promise<Product> {
  return apiRequest(`/products/${id}`);
}

export function createProduct(input: ProductInput): Promise<Product> {
  return apiRequest('/products', { method: 'POST', body: input });
}

export function updateProduct(id: number, input: Partial<ProductInput>): Promise<Product> {
  return apiRequest(`/products/${id}`, { method: 'PATCH', body: input });
}
