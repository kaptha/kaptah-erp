import { Entity, Column, PrimaryColumn, OneToMany } from 'typeorm';
import { Colonia } from './colonia.entity';

@Entity('codigo_postal')
export class Postal {
  @PrimaryColumn()
  codigo: string;

  @OneToMany(() => Colonia, (colonia) => colonia.codigoPostal)
  colonias: Colonia[];
}
