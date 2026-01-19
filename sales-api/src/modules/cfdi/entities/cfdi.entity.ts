import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('cfdi')
export class Cfdi {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  uuid: string;

  @Column('text')
  xml: string;

   @Column({ 
    type: 'enum',
    enum: ['borrador', 'procesando', 'timbrado', 'cancelado', 'error', 'timbrando', 'cancelando'],
    default: 'borrador'
  })
  status: string;

  @Column({ type: 'timestamp', nullable: true })
  createdAt: Date;

  @Column({ nullable: true })
  file_name: string;

  @Column({ nullable: true })
  file_path: string;

  @Column({ nullable: true })
  created_by: string;

  @Column({ nullable: true })
  user_email: string;

  @Column({ nullable: true })
  tipo_cfdi: string;

  @Column({ nullable: true })
  selloCFD: string;

  @Column({ nullable: true })
  selloSAT: string;

  @Column({ nullable: true })
  noCertificadoSAT: string;

  @Column({ type: 'text', nullable: true })
  cadenaOriginal: string;

  @Column({ type: 'timestamp', nullable: true })
  fechaTimbrado: Date;

  @Column({ type: 'text', nullable: true, name: 'qrImage' })
  qrImage: string;

  @Column({ type: 'int', nullable: true })
  total: number;

  @Column({ type: 'int', nullable: true })
  subtotal: number;

  @Column({ type: 'timestamp', nullable: true })
  canceladoAt: Date;

  @Column({ nullable: true })
  motivoCancelacion: string;

  @Column()
  user_id: string;

  // 👇 AGREGAR: Campos nuevos para tracking
  @Column({ nullable: true })
  serie: string;

  @Column({ nullable: true })
  folio: string;

  @Column({ nullable: true })
  certificado_id: string;

  @Column({ type: 'text', nullable: true })
  error_message: string;

  @Column({ nullable: true })
  emisor_rfc: string;

  @Column({ nullable: true })
  emisor_nombre: string;

  @Column({ nullable: true })
  receptor_rfc: string;

  @Column({ nullable: true })
  receptor_nombre: string;

  @Column({ nullable: true })
  moneda: string;

  @Column({ type: 'decimal', precision: 10, scale: 6, default: 1 })
  tipo_cambio: number;

  @Column({ nullable: true })
  forma_pago: string;

  @Column({ nullable: true })
  metodo_pago: string;

  @Column({ type: 'timestamp', nullable: true })
  updatedAt: Date;
}