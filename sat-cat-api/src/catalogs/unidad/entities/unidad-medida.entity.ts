import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity('unidad_medida')
export class UnidadMedida {
  @PrimaryColumn({ length: 3 })
  clave_unidad: string;

  @Column()
  nombre: string;
}