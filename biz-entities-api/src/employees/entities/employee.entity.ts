import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('empleados')
export class Employee {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  nombre: string;

  @Column({ length: 13 })
  rfc: string;

  @Column({ length: 18 })
  curp: string;

  @Column({ length: 100 })
  email: string;

  @Column({ length: 20 })
  telefono: string;

  @Column({ name: 'fecha_inicio' })
  fechaInicio: Date;

  @Column({ length: 50 })
  puesto: string;

  @Column({ length: 100, nullable: true })
  departamento: string;

  @Column({ name: 'salario_base', type: 'decimal', precision: 12, scale: 2 })
  salarioBase: number;

  @Column({ length: 20, nullable: true })
  salario: string;

  @CreateDateColumn({ name: 'fecha_registro' })
  fechaRegistro: Date;

  @Column({ name: 'fecha_actualizacion', nullable: true })
  fechaActualizacion: Date;

  @Column({ type: 'json', nullable: true, name: 'deducciones' })
  deducciones: any[];

  @Column({ type: 'json', nullable: true, name: 'percepciones' })
  percepciones: any[];

  @Column()
  userId: number;

  @Column({ 
    type: 'enum',
    enum: ['activo', 'inactivo'],
    default: 'activo',
    name: 'estado'
  })
  estado: string;

  @ManyToOne(() => User, (user) => user.employees)
  @JoinColumn({ name: 'userId' })
  user: User;
}