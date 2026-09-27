import { apiRequest } from '../../shared/http';

export interface Customer {
  id: number;
  name: string;
  address: string;
  phone: string;
  createdAt: string;
}

export type CustomerInput = Pick<Customer, 'name' | 'address' | 'phone'>;

export function listCustomers(): Promise<Customer[]> {
  return apiRequest('/customers');
}

export function getCustomer(id: number): Promise<Customer> {
  return apiRequest(`/customers/${id}`);
}

export function createCustomer(input: CustomerInput): Promise<Customer> {
  return apiRequest('/customers', { method: 'POST', body: input });
}
