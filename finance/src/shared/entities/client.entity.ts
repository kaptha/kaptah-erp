import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('clientes') // Nombre exacto de tu tabla
export class Client {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  Nombre: string;

  @Column({ type: 'varchar', length: 255 })
  Email: string;

  @Column({ type: 'varchar', length: 20 })
  Telefono: string;

  @Column({ type: 'varchar', length: 13 })
  RFC: string;

  @Column({ type: 'varchar', length: 255 })
  RegFiscal: string;

  @Column({ type: 'varchar', length: 10 })
  Cpostal: string;

  @Column({ type: 'varchar', length: 255 })
  Colonia: string;

  @Column({ type: 'timestamp' })
  Fecha_Registro: Date;

  @Column({ type: 'int' })
  userId: number;

  // Si tienes timestamps created_at y updated_at, descomenta estas líneas:
  // @CreateDateColumn()
  // created_at: Date;

  // @UpdateDateColumn()
  // updated_at: Date;
}