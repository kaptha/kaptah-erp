import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('usuarios')
export class User {
  @PrimaryGeneratedColumn()
  ID: number;

  @Column({ name: 'Nombre' })
  nombre: string;

  @Column({ unique: true })
  firebaseUid: string;

  @Column({ unique: true })
  email: string;

  @Column({ name: 'Fecha_Registro' })
  fechaRegistro: Date;
}