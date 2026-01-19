import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('cat_tipo_otro_pago')
export class TipoOtroPago {
  @PrimaryColumn({ type: 'varchar', length: 3 })
  c_TipoOtroPago: string;

  @Column({ type: 'varchar', length: 255 })
  descripcion: string;

  @Column({ type: 'date', name: 'fecha_inicio_vigencia' })
  fechaInicioVigencia: Date;

  @Column({ type: 'date', name: 'fecha_fin_vigencia', nullable: true })
  fechaFinVigencia: Date;
}