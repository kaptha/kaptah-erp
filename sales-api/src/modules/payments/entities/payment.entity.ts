import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  documentId: string;

  @Column()
  documentType: 'INVOICE' | 'SALE_NOTE';

  @Column('decimal', { precision: 10, scale: 2 })
  amount: number;

  @Column('timestamp')
  paymentDate: Date;

  @Column({
    type: 'varchar',
    length: 20,
    name: 'paymentMethod',
    nullable: false,
    default: 'CASH'
  })
  paymentMethod: 'CASH' | 'TRANSFER' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'CHECK';

  @Column()
  transactionReference: string;

  @Column({
    type: 'enum',
    enum: ['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED'],
    default: 'PENDING'
  })
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';

  @Column({ type: 'varchar', length: 128 })
  userId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'varchar', length: 128, nullable: true })
  createdBy: string;
}