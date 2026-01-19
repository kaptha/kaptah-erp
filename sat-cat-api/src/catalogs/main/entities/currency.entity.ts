import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity('currency')
export class Currency {
  @PrimaryColumn()
  code: string;

  @Column()
  description: string;
}