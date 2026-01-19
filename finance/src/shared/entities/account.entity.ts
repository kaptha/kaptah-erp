import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('accounts')
export class Account {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ 
    name: 'account_type',
    type: 'varchar',
    length: 50
  })
  accountType: 'receivable' | 'payable';

  @Column({ 
    type: 'varchar',
    length: 50,
    default: 'pending'
  })
  status: 'pending' | 'partial' | 'paid' | 'cancelled';

  @Column({ name: 'partner_id' })
  partnerId: string;

  @Column({ name: 'cfdi_id', nullable: true })
  cfdiId?: string;

  @Column({ 
    name: 'total_amount', 
    type: 'decimal', 
    precision: 15, 
    scale: 2 
  })
  totalAmount: number;

  @Column({ 
    name: 'paid_amount', 
    type: 'decimal', 
    precision: 15, 
    scale: 2, 
    default: 0 
  })
  paidAmount: number;

  @Column({ name: 'credit_days' })
  creditDays: number;

  @Column({ name: 'credit_remaining_days', nullable: true })
  creditRemainingDays?: number;

  @Column({ name: 'due_date', type: 'date' })
  dueDate: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // ✅ Campos adicionales para cuentas por pagar (opcionales)
  @Column({ name: 'provider_name', nullable: true })
  providerName?: string;

  @Column({ name: 'provider_rfc', type: 'varchar', length: 13, nullable: true }) // ✅ AGREGAR ESTE
  providerRfc?: string;

  @Column({ name: 'customer_name', nullable: true })
  customerName?: string;

  @Column({ name: 'customer_rfc', nullable: true })
  customerRfc?: string;

  @Column({ name: 'document_type', nullable: true })
  documentType?: string;

  @Column({ name: 'document_number', nullable: true })
  documentNumber?: string;

  @Column({ name: 'document_reference', nullable: true })
  documentReference?: string;

  @Column({ nullable: true })
  concept?: string;

  @Column({ name: 'issue_date', nullable: true })
  issueDate?: Date;

  @Column({ type: 'text', nullable: true })
  notes?: string;
}