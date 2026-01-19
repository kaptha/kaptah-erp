import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity('cancellation-reason')
export class CancelletionReason {
  @PrimaryColumn()
  code: string;

  @Column()
  description: string;
}