import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity('voucher-type')
export class VoucherType {
  @PrimaryColumn()
  code: string;

  @Column()
  description: string;
}