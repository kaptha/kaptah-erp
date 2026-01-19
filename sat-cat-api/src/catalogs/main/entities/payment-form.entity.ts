import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity('payment_forms')
export class PaymentForm {
  @PrimaryColumn()
  code: string;

  @Column()
  description: string;
}