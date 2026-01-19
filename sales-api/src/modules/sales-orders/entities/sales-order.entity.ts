import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('sales_orders')
export class SalesOrder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ✨ Folio único formato: OV-2025-0001
  @Column({ type: 'varchar', length: 20, unique: true })
  folio: string;

  @Column({ name: 'userid', type: 'varchar', length: 128 })
  userId: string;

  @Column()
  customerName: string;

  @Column({ nullable: true })
  customerAddress: string;

  @Column()
  customerRfc: string;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  subtotal: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  tax: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  total: number;

  @Column({ 
    type: 'enum',
    enum: ['PENDING', 'PROCESSING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'],
    default: 'PENDING'
  })
  status: string;

  @Column('jsonb')
  items: any[];

  // ✨ NUEVO: Campo para sucursal
  @Column({ type: 'int', nullable: true })
  sucursalId?: number;

  // 👇 AGREGAR: Campos para inventario
  @Column({ type: 'boolean', default: false })
  inventarioReservado: boolean;

  @Column({ type: 'varchar', nullable: true })
  almacenId?: string;

  // 👇 AGREGAR: Campos para tracking
  @Column({ type: 'boolean', default: false })
  pdfGenerado: boolean;

  @Column({ type: 'boolean', default: false })
  emailEnviado: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;

  @Column({ type: 'varchar', length: 128 }) 
  createdBy: string;

  @Column({ type: 'varchar', length: 128, nullable: true })
  usuario_id: string;
}