import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn
} from 'typeorm';
import { BranchTransfer } from './branch-transfer.entity';

@Entity('branch_transfer_items')
export class BranchTransferItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  @Index()
  transfer_id: number;

  @Column({ type: 'int' })
  @Index()
  product_id: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  quantity: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  cost: number;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @ManyToOne(() => BranchTransfer, (transfer) => transfer.items)
  @JoinColumn({ name: 'transfer_id' })
  transfer: BranchTransfer;
}
