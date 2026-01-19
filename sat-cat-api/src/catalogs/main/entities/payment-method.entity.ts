import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity('payment_method')
export class PaymentMethod {
  @PrimaryColumn()
  code: string;

  @Column()
  description: string;
}