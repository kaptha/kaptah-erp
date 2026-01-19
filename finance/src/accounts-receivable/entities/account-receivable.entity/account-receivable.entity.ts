import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('accounts')
export class AccountReceivable {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'account_type', default: 'receivable' })
  accountType: string;

  @Column({ default: 'pending' })
  status: string;

  @Column({ name: 'partner_id', type: 'int' })
  partnerId: number;

  @Column({ name: 'customer_name', type: 'varchar', length: 255 })
  customerName: string;

  @Column({ name: 'customer_rfc', type: 'varchar', length: 20 })
  customerRfc: string;

  @Column({ name: 'total_amount', type: 'numeric', precision: 12, scale: 2 })
  totalAmount: number;

  @Column({ name: 'paid_amount', type: 'numeric', precision: 12, scale: 2, default: 0 })
  paidAmount: number;

  @Column({ name: 'credit_days', type: 'int' })
  creditDays: number;

  @Column({ name: 'credit_remaining_days', type: 'int', nullable: true })
  creditRemainingDays: number;

  @Column({ name: 'due_date', type: 'date' })
  dueDate: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'document_number', type: 'varchar', nullable: true })
  documentNumber: string;

  @Column({ name: 'document_type', type: 'varchar', nullable: true })
  documentType: string;

  @Column({ name: 'document_reference', type: 'varchar', nullable: true })
  documentReference: string;

  @Column({ name: 'concept', type: 'varchar' })
  concept: string;

  @Column({ name: 'issue_date', type: 'date', nullable: true })
  issueDate: Date;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes: string;
}
