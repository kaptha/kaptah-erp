import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('cat_tipo_deduccion')
export class TipoDeduccion {
  @PrimaryColumn({ type: 'varchar', length: 10, name: 'c_tipodeduccion' })
  c_TipoDeduccion: string;

  @Column({ type: 'varchar', length: 255 })
  descripcion: string;

  @Column({ type: 'date', name: 'fecha_inicio_vigencia', nullable: true })
  fechaInicioVigencia: Date;

  @Column({ type: 'date', name: 'fecha_fin_vigencia', nullable: true })
  fechaFinVigencia: Date;
}