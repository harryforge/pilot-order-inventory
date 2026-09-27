import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Customer } from '../customers/customer.entity.js';
import { OrderLine } from './order-line.entity.js';
import type { OrderStatus } from './order-status.js';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('identity')
  id: number;

  /** `SO-` plus six digits from the `order_number_seq` sequence, for example `SO-000042`. */
  @Column({ name: 'order_number', type: 'varchar', length: 20 })
  orderNumber: string;

  @Column({ name: 'customer_id', type: 'integer' })
  customerId: number;

  @ManyToOne(() => Customer)
  @JoinColumn({ name: 'customer_id' })
  customer?: Customer;

  @Column({ type: 'varchar', length: 10 })
  status: OrderStatus;

  /** Sum of the line amounts in JPY. No tax (a later task). */
  @Column({ name: 'total_amount', type: 'integer' })
  totalAmount: number;

  @CreateDateColumn({ name: 'ordered_at', type: 'timestamptz' })
  orderedAt: Date;

  @Column({ name: 'shipped_at', type: 'timestamptz', nullable: true })
  shippedAt: Date | null;

  @OneToMany(() => OrderLine, (line) => line.order)
  lines?: OrderLine[];
}
