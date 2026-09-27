import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import type { SalesStatus } from './sales-status.js';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('identity')
  id: number;

  @Column({ type: 'varchar', length: 64 })
  sku: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  /** Unit price in JPY. Whole yen only. */
  @Column({ type: 'integer' })
  price: number;

  @Column({ name: 'sales_status', type: 'varchar', length: 20 })
  salesStatus: SalesStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
