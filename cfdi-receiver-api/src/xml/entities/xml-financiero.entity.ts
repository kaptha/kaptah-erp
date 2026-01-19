import { Entity, Column, PrimaryGeneratedColumn, Index, CreateDateColumn } from 'typeorm';

@Entity('xmls_financieros')
@Index(['usuario_id', 'fecha'])
@Index(['rfc_emisor', 'fecha'])
@Index(['rfc_receptor', 'fecha'])
@Index(['folio_fiscal'])
export class XmlFinanciero {
  @PrimaryGeneratedColumn()
  id: number;

  // Relación con XML original
  @Column()
  xml_recibido_id: number;

  @Column({type: 'varchar', length:255})
  usuario_id: string;

  // Datos básicos del comprobante
  @Column({ nullable: true })
  folio: string;

  @Column({ nullable: true })
  serie: string;

  @Column({ type: 'timestamp' })
  fecha: Date;

  @Column({ unique: true })
  folio_fiscal: string; // UUID

  // Datos financieros
  @Column({ default: 'MXN' })
  moneda: string;

  @Column({ type: 'decimal', precision: 18, scale: 6, nullable: true })
  tipo_cambio: number;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  sub_total: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, nullable: true })
  descuento: number;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  total: number;

  // Datos de pago
  @Column({ nullable: true })
  forma_pago: string;

  @Column({ nullable: true })
  metodo_pago: string;

  @Column({ nullable: true })
  condiciones_pago: string;

  // Datos del emisor
  @Column()
  rfc_emisor: string;

  @Column({ nullable: true })
  nombre_emisor: string;

  @Column({ nullable: true })
  regimen_fiscal_emisor: string;

  // Datos del receptor
  @Column()
  rfc_receptor: string;

  @Column({ nullable: true })
  nombre_receptor: string;

  @Column({ nullable: true })
  uso_cfdi: string;

  // Impuestos
  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  total_impuestos_trasladados: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  total_impuestos_retenidos: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  iva_trasladado: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  iva_retenido: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  isr_retenido: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  ieps_retenido: number;

  // Metadatos
  @Column()
  version: string;

  @Column()
  tipo_comprobante: string; // I=Ingreso, E=Egreso, T=Traslado, N=Nómina, P=Pago

  @Column({ nullable: true })
  lugar_expedicion: string;

  // Datos de procesamiento
  @Column({ default: 'PROCESADO' })
  estado_procesamiento: string;

  @CreateDateColumn()
  fecha_procesamiento: Date;

  // JSON para conceptos detallados (opcional)
  @Column({ type: 'json', nullable: true })
  conceptos_detalle: any;
}