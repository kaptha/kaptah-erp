import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('cat_tipo_nomina')
export class TipoNomina {
  @PrimaryColumn({ type: 'varchar', length: 10, name: 'c_tiponomina' })
  c_TipoNomina: string;

  @Column({ type: 'varchar', length: 255 })
  descripcion: string;

  @Column({ type: 'date', name: 'fecha_inicio_vigencia', nullable: true })
  fechaInicioVigencia: Date;

  @Column({ type: 'date', name: 'fecha_fin_vigencia', nullable: true })
  fechaFinVigencia: Date;
}