import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('xmls_recibidos')
export class XmlRecibido {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'rfc_emisor', type: 'varchar', length: 13, nullable: true })
  rfc_emisor: string;

  @Column({ name: 'rfc_receptor', type: 'varchar', length: 13, nullable: true })
  rfc_receptor: string;

  @Column({ name: 'nombre_emisor', type: 'varchar', length: 255, nullable: true })
  nombre_emisor: string;

  @Column({ name: 'fecha_recepcion', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  fecha_recepcion: Date;

  @Column({ name: 'xml_completo', type: 'text' })
  xml_completo: string;

  @Column({ name: 'usuario_id', type: 'varchar', length: 255 })
  usuario_id: string;

  @Column({ name: 'estado_procesamiento', type: 'varchar', length: 50, default: 'PENDIENTE' })
  estado_procesamiento: string;

  @Column({ name: 'folio', type: 'varchar', length: 50, nullable: true })
  folio: string;

  @Column({ name: 'serie', type: 'varchar', length: 50, nullable: true })
  serie: string;

  @Column({ name: 'total', type: 'decimal', precision: 15, scale: 2, nullable: true })
  total: number;

  @Column({ name: 'subtotal', type: 'decimal', precision: 15, scale: 2, nullable: true })
  subtotal: number;

  @Column({ name: 'iva', type: 'decimal', precision: 15, scale: 2, nullable: true })
  iva: number;

  @Column({ name: 'moneda', type: 'varchar', length: 10, nullable: true })
  moneda: string;

  @Column({ name: 'tipo_comprobante', type: 'varchar', length: 2, nullable: true })
  tipo_comprobante: string;

  @Column({ name: 'uso_cfdi', type: 'varchar', length: 10, nullable: true })
  uso_cfdi: string;

  @Column({ name: 'metodo_pago', type: 'varchar', length: 50, nullable: true })
  metodo_pago: string;

  @Column({ name: 'forma_pago', type: 'varchar', length: 50, nullable: true })
  forma_pago: string;
}