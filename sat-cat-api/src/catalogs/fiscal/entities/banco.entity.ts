import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('cat_banco')
export class Banco {
  @PrimaryColumn({ type: 'varchar', length: 10, name: 'c_banco' })
  c_Banco: string;

  @Column({ type: 'varchar', length: 255 })
  nombre_corto: string;

  @Column({ type: 'varchar', length: 500 })
  razon_social: string;

  @Column({ type: 'date', name: 'fecha_inicio_vigencia', nullable: true })
  fechaInicioVigencia: Date;

  @Column({ type: 'date', name: 'fecha_fin_vigencia', nullable: true })
  fechaFinVigencia: Date;
}