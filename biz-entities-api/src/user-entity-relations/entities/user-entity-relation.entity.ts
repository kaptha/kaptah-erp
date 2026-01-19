import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('relacion_usuario_entidades')
export class UserEntityRelation {
  @PrimaryGeneratedColumn()
  ID: number;

  @Column()
  ID_Usuario: number;

  @Column()
  ID_Entidad: number;

  @Column({
    type: 'enum',
    enum: ['Cliente', 'Proveedor', 'Empleado'],
  })
  Tipo_Entidad: string;

  @CreateDateColumn()
  Fecha_Creacion: Date;

  @ManyToOne(() => User, (user) => user.entidadesRelacionadas)
  @JoinColumn({ name: 'ID_Usuario' })
  usuario: User;
}