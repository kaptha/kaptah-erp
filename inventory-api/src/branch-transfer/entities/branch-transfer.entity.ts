import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany
} from 'typeorm';
import { BranchTransferItem } from './branch-transfer-item.entity';

export type TransferStatus = 'pending' | 'in_transit' | 'completed' | 'cancelled';

@Entity('branch_transfers')
export class BranchTransfer {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  @Index()
  userId: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  @Index()
  transfer_number: string;

  @Column({ type: 'int' })
  @Index()
  from_branch_id: number;

  @Column({ type: 'int' })
  @Index()
  to_branch_id: number;

  @Column({
    type: 'enum',
    enum: ['pending', 'in_transit', 'completed', 'cancelled'],
    default: 'pending'
  })
  @Index()
  status: TransferStatus;

  @Column({ type: 'varchar', length: 255 })
  requested_by: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  approved_by: string;

  @Column({ type: 'timestamp', nullable: true })
  shipped_date: Date;

  @Column({ type: 'timestamp', nullable: true })
  received_date: Date;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;

  @OneToMany(() => BranchTransferItem, (item) => item.transfer, { eager: false })
  items: BranchTransferItem[];
}
