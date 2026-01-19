import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('cat_origen_recurso')
export class OrigenRecurso {
  @PrimaryColumn({ type: 'varchar', length: 2 })
  c_OrigenRecurso: string;

  @Column({ type: 'varchar', length: 255 })
  descripcion: string;

  @Column({ type: 'date', name: 'fecha_inicio_vigencia' })
  fechaInicioVigencia: Date;

  @Column({ type: 'date', name: 'fecha_fin_vigencia', nullable: true })
  fechaFinVigencia: Date;
}