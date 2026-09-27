import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import type { MovementReason, MovementType } from './movement.js';

/** One entry of the stock history. Rows are only inserted, never changed. */
@Entity('stock_movements')
export class StockMovement {
  @PrimaryGeneratedColumn('identity')
  id: number;

  @Column({ name: 'product_id', type: 'integer' })
  productId: number;

  @Column({ type: 'varchar', length: 10 })
  type: MovementType;

  @Column({ type: 'varchar', length: 20 })
  reason: MovementReason;

  /** Always positive; `type` gives the direction. */
  @Column({ type: 'integer' })
  quantity: number;

  /** Stock of the product right after this movement. */
  @Column({ name: 'balance_after', type: 'integer' })
  balanceAfter: number;

  @Column({ name: 'order_id', type: 'integer', nullable: true })
  orderId: number | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  note: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
