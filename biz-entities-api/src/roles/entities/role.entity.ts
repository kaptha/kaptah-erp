import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50 })
  nombre: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  descripcion: string;

  @Column({ type: 'json' })
  permisos: Record<string, { leer: boolean; crear: boolean; editar: boolean; eliminar: boolean }>;

  @Column({ name: 'es_predefinido', type: 'boolean', default: false })
  esPredefinido: boolean;

  @Column({ name: 'cuenta_firebase_uid', type: 'varchar', length: 128 })
  cuentaFirebaseUid: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
