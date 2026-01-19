import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity('clave_prod_serv')
export class ClaveProdServ {
  @PrimaryColumn({ length: 8 })
  c_ClaveProdServ: string;

  @Column()
  descripcion: string;
}