import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('clientes')
export class Client {
  @PrimaryGeneratedColumn()
  ID: number;

  @Column({ length: 100 })
  nombre: string;

  @Column({ type: 'enum', enum: ['fisica', 'moral'] })
  tipoPersona: 'fisica' | 'moral';

  @Column({ length: 100, unique: true })
  email: string;

  @Column({ length: 20 })
  Telefono: string;

  @Column({ length: 13 })
  Rfc: string;

  @Column({ length: 50 })
  RegFiscal: string;

  @Column({ type: 'varchar', length: 255 })
  Direccion: string;

  @Column({ type: 'varchar', length: 100 })
  Ciudad: string;

  @Column({ length: 5 })
  Cpostal: string;

  @Column({ length: 100 })
  Colonia: string;

  @CreateDateColumn()
  Fecha_Registro: Date;

  @Column()
  userId: number;

  @ManyToOne(() => User, (user) => user.clients)
  @JoinColumn({ name: 'userId' })
  user: User;
}