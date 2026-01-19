import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity('moneda')
export class Moneda {
  @PrimaryColumn({ length: 3 })
  c_Moneda: string;

  @Column()
  descripcion: string;
}