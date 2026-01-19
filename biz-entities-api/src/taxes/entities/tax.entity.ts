import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('impuestos')
export class Tax {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  alias: string;

  @Column({ length: 100 })
  uso: string;

  @Column({ length: 100 })
  tipo_impuesto: string;

  @Column({ length: 100 })
  impuesto: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  tasa: number;

  @Column({ length: 100 })
  valor_cuota: string;

  @Column()
  userId: number;

  @ManyToOne(() => User, (user) => user.taxes)
  @JoinColumn({ name: 'userId' })
  user: User;
}
