import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { SalesOrder } from '../../sales-orders/entities/sales-order.entity';

@Entity('delivery_notes')
export class DeliveryNote {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ✨ Folio único formato: REM-2025-0001
  @Column({ type: 'varchar', length: 20, unique: true })
  folio: string;

  @Column('uuid')
  salesOrderId: string;

  @Column({ type: 'varchar', length: 128 })
  userId: string;

  @ManyToOne(() => SalesOrder)
  @JoinColumn({ name: 'salesOrderId' })
  salesOrder: SalesOrder;

  @Column({ nullable: true })
  sucursalId: number;

  @Column('timestamp')
  deliveryDate: Date;

  @Column({ 
    type: 'enum',
    enum: ['PENDING', 'PROCESSING', 'TRANSIT', 'DELIVERED', 'CANCELLED'],
    default: 'PENDING'
  })
  status: 'PENDING' | 'PROCESSING' | 'TRANSIT' | 'DELIVERED' | 'CANCELLED';

  @Column('jsonb')
  items: {
    productId: string;
    quantity: number;
    description: string;
    deliveredQuantity?: number;
  }[];

 // 👇 AGREGAR: Campos para inventario
  @Column({ type: 'boolean', default: false })
  inventarioAfectado: boolean;

  @Column({ type: 'varchar', nullable: true })
  almacenId?: string;

  // 👇 AGREGAR: Campos para tracking
  @Column({ type: 'boolean', default: false })
  pdfGenerado: boolean;

  @Column({ type: 'boolean', default: false })
  emailEnviado: boolean;

  @Column({ type: 'timestamp', nullable: true })
  fechaEntrega?: Date;

  @Column({ type: 'text', nullable: true })
  notasEntrega?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  receptorNombre?: string;

  @Column({ type: 'text', nullable: true })
  firmaReceptor?: string; // Base64 de firma si se requiere

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'varchar', length: 128, nullable: true })
  createdBy: string;
}
