import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Cotizacion } from './cotizacion.entity';

@Entity('cotizacion_items')
export class CotizacionItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'cotizacion_id' })  // ✅ snake_case (línea 2)
  cotizacionId: number;

  @Column({ name: 'producto_id', nullable: true })  // ✅ snake_case (línea 3)
  productoId?: number;

  @Column({ name: 'servicio_id', nullable: true })  // ✅ snake_case (línea 13)
  servicioId?: number;

  @Column({ type: 'varchar', length: 255 })  // ✅ (línea 14)
  tipo: string;

  @Column({ type: 'text' })  // ✅ (línea 15)
  descripcion: string;

  @Column()  // ✅ (línea 4)
  cantidad: number;

  @Column({ name: 'precio_unitario', type: 'decimal', precision: 10, scale: 2 })  // ✅ snake_case (línea 5)
  precioUnitario: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })  // ✅ (línea 6)
  descuento: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })  // ✅ (línea 8)
  subtotal: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })  // ✅ (línea 7)
  impuestos: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })  // ✅ (línea 9)
  total: number;

  @Column({ type: 'json', nullable: true, name: 'impuestos_seleccionados' })  // ✅ snake_case (línea 16)
  impuestosSeleccionados?: any;

  @Column({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })  // ✅ snake_case (línea 10)
  createdAt: Date;

  @Column({ 
    name: 'updated_at',  // ✅ snake_case (línea 11)
    type: 'timestamp', 
    default: () => 'CURRENT_TIMESTAMP', 
    onUpdate: 'CURRENT_TIMESTAMP' 
  })
  updatedAt: Date;

  @ManyToOne(() => Cotizacion, (cotizacion) => cotizacion.items)
  @JoinColumn({ name: 'cotizacion_id' })  // ✅ snake_case
  cotizacion: Cotizacion;
}