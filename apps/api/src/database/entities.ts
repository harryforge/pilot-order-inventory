import { Customer } from '../customers/customer.entity.js';
import { InventoryItem } from '../inventory/inventory-item.entity.js';
import { StockMovement } from '../inventory/stock-movement.entity.js';
import { Product } from '../products/product.entity.js';

/** Every entity of the app. Add new entities here. */
export const ENTITIES = [Product, InventoryItem, StockMovement, Customer];
