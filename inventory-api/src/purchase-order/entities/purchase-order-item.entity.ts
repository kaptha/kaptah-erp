import { 
  Entity, 
  Column, 
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn 
} from 'typeorm';
import { PurchaseOrder } from './purchase-order.entity';
import { Product } from '../../product/entities/product.entity';

@Entity('purchase_order_items')
export class PurchaseOrderItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'purchase_order_id' })
  purchaseOrderId: number;

  @Column({ name: 'product_id' })
  productId: number;

  @Column({ name: 'product_name', length: 200 })
  product_name: string; // ← Cambiar a snake_case

  @Column({ name: 'product_sku', length: 50, nullable: true })
  product_sku: string; // ← Cambiar a snake_case

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  quantity: number;

  @Column({ 
    type: 'decimal', 
    precision: 10, 
    scale: 2, 
    name: 'quantity_received', 
    default: 0 
  })
  quantityReceived: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'unit_cost' })
  unit_cost: number; // ← Cambiar a snake_case

  @Column({ type: 'decimal', precision: 5, scale: 2, name: 'tax_rate', default: 0 })
  tax_rate: number; // ← Cambiar a snake_case

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  subtotal: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  taxAmount: number; // ← Cambiar de tax_amount a taxAmount (camelCase como en la DB)

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  total: number;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @ManyToOne(() => PurchaseOrder, order => order.items, {
    onDelete: 'CASCADE'
  })
  @JoinColumn({ name: 'purchase_order_id' })
  purchaseOrder: PurchaseOrder;

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'product_id' })
  product: Product;
}