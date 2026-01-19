import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'usuarios'})
export class Usuario {
  @PrimaryGeneratedColumn()
  ID: number;

  @Column({ name: 'firebaseUid', type: 'varchar', length: 255 })
  firebaseUid: string;

  @Column({ name: 'realtimeDbKey', type: 'varchar', length: 255, nullable: true })
  realtimeDbKey: string;

  @Column({ name: 'Nombre', type: 'varchar', length: 255 })
  Nombre: string;

  @Column({ name: 'Email', type: 'varchar', length: 255 })
  Email: string;

  @Column({ name: 'Fecha_Registro', type: 'datetime' }) // 👈 datetime es válido en MySQL
  Fecha_Registro: Date;

  @Column({ name: 'telefono', type: 'varchar', length: 20, nullable: true })
  telefono: string;

  @Column({ name: 'fiscalReg', type: 'varchar', length: 50, nullable: true })
  fiscalReg: string;

  @Column({ name: 'nombreComercial', type: 'varchar', length: 255, nullable: true })
  nombreComercial: string;

  @Column({ name: 'updated_at', type: 'datetime', nullable: true }) // 👈 datetime es válido en MySQL
  updated_at: Date;

  @Column({ name: 'rfc', type: 'varchar', length: 13, nullable: true })
  rfc: string;

  @Column({ name: 'tipo_persona', type: 'varchar', length: 50, nullable: true })
  tipo_persona: string;

  @Column({ type: 'text', nullable: true })
  terminos_condiciones_cotizacion: string;
}