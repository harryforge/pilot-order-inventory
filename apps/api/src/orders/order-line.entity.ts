import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Product } from '../products/product.entity.js';
import type { Order } from './order.entity.js';

@Entity('order_lines')
export class OrderLine {
  @PrimaryGeneratedColumn('identity')
  id: number;

  @Column({ name: 'order_id', type: 'integer' })
  orderId: number;

  // String target avoids a circular import with order.entity.ts at module load time.
  @ManyToOne('Order', 'lines')
  @JoinColumn({ name: 'order_id' })
  order?: Order;

  @Column({ name: 'product_id', type: 'integer' })
  productId: number;

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'product_id' })
  product?: Product;

  @Column({ type: 'integer' })
  quantity: number;

  /** Product price in JPY when the order was created. Later price changes do not affect it. */
  @Column({ name: 'unit_price', type: 'integer' })
  unitPrice: number;

  @Column({ name: 'line_amount', type: 'integer' })
  lineAmount: number;
}
