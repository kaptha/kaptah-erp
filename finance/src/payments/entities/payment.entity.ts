import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { PaymentMethod } from '../dto/create-payment.dto';

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 20 })
  paymentMethod: string;

  @Column({ nullable: true })
  reference: string;

  @Column({ nullable: true })
  notes: string;

  @Column({ nullable: true, type: 'uuid' })
  accountPayableId: string;

  @Column({ nullable: true, type: 'uuid' })
  accountReceivableId: string;

  @Column({ type: 'timestamp', nullable: true })
  paymentDate: Date;

  @Column({ nullable: true })
  userId: string;

  @Column({ nullable: true, type: 'uuid' })
  documentId: string;

  @Column({ nullable: true })
  createdBy: string;

  @Column({ nullable: true })
  documentType: string;

  @Column({ nullable: true })
  transactionReference: string;

  @Column({ nullable: true })
  status: string;

  @Column({ nullable: true })
  documentReference: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}