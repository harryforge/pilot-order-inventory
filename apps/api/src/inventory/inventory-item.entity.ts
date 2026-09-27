import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { Product } from '../products/product.entity.js';

/** Current stock of one product. There is a single warehouse, so one row per product. */
@Entity('inventory_items')
export class InventoryItem {
  @PrimaryColumn({ name: 'product_id', type: 'integer' })
  productId: number;

  @OneToOne(() => Product)
  @JoinColumn({ name: 'product_id' })
  product?: Product;

  /** Never negative (check constraint `ck_inventory_items_quantity`). */
  @Column({ type: 'integer' })
  quantity: number;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
