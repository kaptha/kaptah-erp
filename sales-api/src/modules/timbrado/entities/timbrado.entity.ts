import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Timbrado {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  invoiceId: string;

  @Column()
  uuid: string;

  @Column()
  emitterRfc: string;

  @Column()
  receiverRfc: string;

  @Column('decimal', { precision: 10, scale: 2 })
  total: number;

  @Column()
  status: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  // Agrega más campos según sea necesario
}