import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Role } from './role.entity';

@Entity('usuario_roles')
export class UsuarioRole {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'usuario_firebase_uid', type: 'varchar', length: 128 })
  usuarioFirebaseUid: string;

  @Column({ name: 'cuenta_firebase_uid', type: 'varchar', length: 128 })
  cuentaFirebaseUid: string;

  @Column({ name: 'rol_id' })
  rolId: number;

  @ManyToOne(() => Role, { eager: true })
  @JoinColumn({ name: 'rol_id' })
  rol: Role;

  @Column({ name: 'asignado_por', type: 'varchar', length: 128 })
  asignadoPor: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
