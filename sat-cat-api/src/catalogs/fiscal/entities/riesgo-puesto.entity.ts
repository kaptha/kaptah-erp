import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('cat_riesgo_puesto')
export class RiesgoPuesto {
  @PrimaryColumn({ type: 'varchar', length: 10 })
  c_RiesgoPuesto: string;

  @Column({ type: 'varchar', length: 255 })
  descripcion: string;

  @Column({ type: 'date', name: 'fecha_inicio_vigencia' })
  fechaInicioVigencia: Date;

  @Column({ type: 'date', name: 'fecha_fin_vigencia', nullable: true })
  fechaFinVigencia: Date;
}