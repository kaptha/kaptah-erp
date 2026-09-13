import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type SatSolicitudTipo = 'RECIBIDOS' | 'EMITIDOS';
export type SatSolicitudTipoSolicitud = 'CFDI' | 'Metadata';
export type SatSolicitudOrigen = 'CRON' | 'MANUAL';

/** Estado interno (además del EstadoSolicitud crudo del SAT) */
export type SatSolicitudEstado =
  | 'ENVIADA' // aceptada por el SAT, en espera
  | 'LISTA' // SAT terminó, hay paquetes por descargar
  | 'DESCARGANDO'
  | 'IMPORTADA' // todos los paquetes descargados e importados
  | 'SIN_CFDI' // 5004: no había comprobantes
  | 'RECHAZADA' // 5002/5005 u otro rechazo
  | 'VENCIDA' // 6
  | 'ERROR';

export interface SatPaquete {
  id: string;
  descargado: boolean;
  bytes?: number;
  cfdisEnPaquete?: number;
  cfdisImportados?: number;
  duplicados?: number;
  error?: string;
}

/**
 * Una solicitud de descarga masiva presentada al SAT.
 * Vive en la base compartida; la tabla se crea con migration-sat-solicitudes.sql.
 */
@Entity('sat_solicitudes')
@Index(['cuentaUid', 'estado'])
@Index(['cuentaUid', 'tipo', 'tipoSolicitud', 'fechaInicial', 'fechaFinal'])
export class SatSolicitud {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'cuenta_uid', type: 'varchar', length: 128 })
  cuentaUid: string;

  @Column({ name: 'rfc', type: 'varchar', length: 13 })
  rfc: string;

  @Column({ name: 'id_solicitud', type: 'varchar', length: 36, unique: true })
  idSolicitud: string;

  @Column({ name: 'tipo', type: 'varchar', length: 10 })
  tipo: SatSolicitudTipo;

  @Column({ name: 'tipo_solicitud', type: 'varchar', length: 10 })
  tipoSolicitud: SatSolicitudTipoSolicitud;

  /** Hora de pared sin zona, tal como se envió al SAT: YYYY-MM-DDTHH:mm:ss */
  @Column({ name: 'fecha_inicial', type: 'varchar', length: 19 })
  fechaInicial: string;

  @Column({ name: 'fecha_final', type: 'varchar', length: 19 })
  fechaFinal: string;

  @Column({ name: 'estado', type: 'varchar', length: 15, default: 'ENVIADA' })
  estado: SatSolicitudEstado;

  /** EstadoSolicitud crudo del SAT (1-6) en la última verificación */
  @Column({ name: 'estado_solicitud_sat', type: 'smallint', nullable: true })
  estadoSolicitudSat: number | null;

  /** CodigoEstadoSolicitud del SAT (5000-5005) */
  @Column({ name: 'codigo_estado_sat', type: 'integer', nullable: true })
  codigoEstadoSat: number | null;

  @Column({ name: 'numero_cfdis', type: 'integer', default: 0 })
  numeroCfdis: number;

  @Column({ name: 'paquetes', type: 'jsonb', default: () => "'[]'" })
  paquetes: SatPaquete[];

  @Column({ name: 'origen', type: 'varchar', length: 10, default: 'MANUAL' })
  origen: SatSolicitudOrigen;

  @Column({ name: 'intentos_verificacion', type: 'integer', default: 0 })
  intentosVerificacion: number;

  @Column({ name: 'ultima_verificacion', type: 'timestamptz', nullable: true })
  ultimaVerificacion: Date | null;

  @Column({ name: 'error', type: 'text', nullable: true })
  error: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
