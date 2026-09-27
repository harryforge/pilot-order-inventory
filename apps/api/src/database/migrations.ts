import { CreateProductsAndInventory1790000000000 } from '../migrations/1790000000000-CreateProductsAndInventory.js';
import { CreateCustomers1790000001000 } from '../migrations/1790000001000-CreateCustomers.js';

/** Every migration, oldest first. Add new migrations at the end. */
export const MIGRATIONS = [CreateProductsAndInventory1790000000000, CreateCustomers1790000001000];
