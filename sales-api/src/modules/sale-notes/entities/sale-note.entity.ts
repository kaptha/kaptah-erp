import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export interface TaxItem {
  taxId: number;
  name: string;
  rate: string;
  amount: number;
}

export interface SaleNoteItem {
  productId: string;      // ← String (UUID)
  quantity: number;
  unitPrice: number;      // ← Number (se convierte del DTO)
  description: string;
  subtotal: number;
  taxes?: TaxItem[];
  taxesTotal?: number;
  total?: number;
}

@Entity('sale_notes')
export class SaleNote {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 20, unique: true })
  folio: string;

  @Column({ type: 'varchar', length: 128 })
  customerName: string;

  @Column({ type: 'varchar', length: 13 })
  customerRfc: string;

  @Column('timestamp')
  saleDate: Date;

  @Column('decimal', { precision: 10, scale: 2 })
  total: number;

  @Column('jsonb')
  items: SaleNoteItem[];

  @Column({ 
    type: 'enum', 
    enum: ['CASH', 'CARD', 'TRANSFER']
  })
  paymentMethod: 'CASH' | 'CARD' | 'TRANSFER';

  @Column({ default: 'PROCESSING' })
  status: 'COMPLETED' | 'CANCELLED' | 'PROCESSING';

  @Column({ type: 'varchar', length: 128 })
  userId: string;

  @Column({ type: 'int', nullable: true })
  sucursalId?: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'varchar', length: 128, nullable: true })
  createdBy: string;
}