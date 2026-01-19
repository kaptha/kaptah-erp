import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('sucursales')
export class Branch {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  alias: string;

  @Column({ length: 20 })
  telefono: string;

  @Column({ length: 200 })
  direccion: string;

  @Column()
  codigoPostal: number;

  @Column({ length: 100 })
  colonia: string;
  
  @Column()
  userId: number;

  @ManyToOne(() => User, (user) => user.branches)
  @JoinColumn({ name: 'userId' })
  user: User;
}

