import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('branch_inventory')
@Index(['userId', 'branch_id', 'product_id'], { unique: true })
export class BranchInventory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  @Index()
  userId: string;

  @Column({ type: 'int' })
  @Index()
  branch_id: number;

  @Column({ type: 'int' })
  @Index()
  product_id: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  quantity: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  min_stock: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  max_stock: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  cost: number;

  @Column({ type: 'timestamp', nullable: true })
  last_movement_date: Date;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;
}
