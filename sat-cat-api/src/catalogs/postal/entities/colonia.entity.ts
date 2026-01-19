import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Postal } from './postal.entity';

@Entity('colonia')
export class Colonia {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  nombre: string;

  @Column({ name: 'codigo_postal' })
  codigoPostal: string;

  @ManyToOne(() => Postal, (postal) => postal.colonias)
  @JoinColumn({ name: 'codigo_postal', referencedColumnName: 'codigo' })
  codigoPostalRelacion: Postal;
}
