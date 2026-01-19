import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { CotizacionItem } from './cotizacion-item.entity';

@Entity('cotizaciones')
export class Cotizacion {
  @PrimaryGeneratedColumn()
  id: number;

  // ✨ Folio único formato: COT-2025-0001
  @Column({ type: 'varchar', length: 20, unique: true })
  folio: string;

  @Column({ name: 'usuario_id' })  
  usuarioId: number;

  @Column({ name: 'cliente_id' }) 
  clienteId: number;

  @Column({ name: 'sucursal_id', nullable: true }) 
  sucursalId?: number;

  @Column({ name: 'fecha_creacion', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })  
  fechaCreacion: Date;

  @Column({ name: 'fecha_validez', type: 'date' })  
  fechaValidez: Date;

  @Column({ name: 'cliente_nombre', type: 'varchar', length: 255, nullable: true })
  clienteNombre: string;

  @Column({ name: 'cliente_rfc', type: 'varchar', length: 13, nullable: true })
  clienteRfc: string;

  @Column({ name: 'cliente_direccion', type: 'varchar', length: 500, nullable: true })
  clienteDireccion: string;

  @Column({ name: 'cliente_ciudad', type: 'varchar', length: 100, nullable: true })
  clienteCiudad: string;

  @Column({ name: 'cliente_telefono', type: 'varchar', length: 20, nullable: true })
  clienteTelefono: string;

  @Column({ 
    type: 'enum',
    enum: ['borrador', 'enviada', 'aprobada', 'rechazada', 'vencida', 'convertida'],
    default: 'borrador'
  })
  estado: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  subtotal: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  impuestos: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  total: number;

  @Column()
  moneda: string;

  @Column({ type: 'text', nullable: true })
  observaciones?: string;

  // 👇 AGREGAR: Campos para tracking
  @Column({ type: 'boolean', default: false })
  pdfGenerado: boolean;

  @Column({ type: 'boolean', default: false })
  emailEnviado: boolean;

  @Column({ type: 'timestamp', nullable: true })
  fechaEnvio?: Date;

  @Column({ type: 'timestamp', nullable: true })
  fechaConversion?: Date;

  @Column({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ 
    name: 'updated_at',
    type: 'timestamp', 
    default: () => 'CURRENT_TIMESTAMP', 
    onUpdate: 'CURRENT_TIMESTAMP' 
  })
  updatedAt: Date;

  @OneToMany(() => CotizacionItem, (item) => item.cotizacion)
  items: CotizacionItem[];
}