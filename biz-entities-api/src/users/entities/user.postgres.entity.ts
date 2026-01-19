import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('usuarios')
export class UserPostgres {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'firebaseid', length: 28 })
  firebaseUid: string;

  @Column({ name: 'realtimedbkey', length: 255 })
  realtimeDbKey: string;

  @Column({ name: 'nombre', length: 255 })
  nombre: string;

  @Column({ name: 'email', length: 255 })
  email: string;
}