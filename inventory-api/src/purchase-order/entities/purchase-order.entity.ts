import { 
  Entity, 
  Column, 
  PrimaryGeneratedColumn, 
  CreateDateColumn, 
  UpdateDateColumn,
  OneToMany 
} from 'typeorm';
import { PurchaseOrderItem } from './purchase-order-item.entity';
import { PurchaseOrderStatus } from '../enums/purchase-order-status.enum';

@Entity('purchase_orders')
export class PurchaseOrder {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'order_number', unique: true, length: 50 })
  orderNumber: string;

  @Column({ name: 'supplier_id' })
  supplierId: number; // Referencia a proveedor en biz-entities-api

  @Column({ name: 'supplier_name', length: 200 })
  supplierName: string; // Desnormalizado para performance

  @Column()
  userId: number;

  @Column({
    type: 'enum',
    enum: PurchaseOrderStatus,
    default: PurchaseOrderStatus.DRAFT
  })
  status: PurchaseOrderStatus;

  @Column({ type: 'date', name: 'order_date' })
  orderDate: Date;

  @Column({ type: 'date', name: 'expected_date', nullable: true })
  expectedDate: Date;

  @Column({ type: 'date', name: 'received_date', nullable: true })
  receivedDate: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  subtotal: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  tax: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  total: number;

  @Column({ length: 3, default: 'MXN' })
  currency: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ name: 'created_by', nullable: true })
  createdBy: number;

  @Column({ name: 'received_by', nullable: true })
  receivedBy: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => PurchaseOrderItem, item => item.purchaseOrder, {
    cascade: true,
    eager: true
  })
  items: PurchaseOrderItem[];
}