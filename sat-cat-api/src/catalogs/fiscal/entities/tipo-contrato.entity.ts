import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('cat_tipo_contrato')
export class TipoContrato {
  @PrimaryColumn({ type: 'varchar', length: 2 })
  c_TipoContrato: string;

  @Column({ type: 'varchar', length: 255 })
  descripcion: string;

  @Column({ type: 'date', name: 'fecha_inicio_vigencia' })
  fechaInicioVigencia: Date;

  @Column({ type: 'date', name: 'fecha_fin_vigencia', nullable: true })
  fechaFinVigencia: Date;
}