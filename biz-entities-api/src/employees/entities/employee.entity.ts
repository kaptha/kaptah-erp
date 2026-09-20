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
  
    @Column({ name: 'codigo_postal', length: 5, nullable: true })
  codigoPostal: string;

  @Column({ name: 'regimen_fiscal', length: 3, default: '605' })
  regimenFiscal: string;

  @Column({ name: 'num_empleado', length: 15, nullable: true })
  numEmpleado: string;

  @Column({ name: 'Nss', length: 11, nullable: true })
  numSeguridadSocial: string;

  @Column({ name: 'tipo_contrato', length: 2, default: '01' })
  tipoContrato: string;

  @Column({ name: 'tipo_regimen', length: 2, default: '02' })
  tipoRegimen: string;

  @Column({ name: 'tipo_jornada', length: 2, nullable: true })
  tipoJornada: string;

  @Column({ name: 'riesgo_puesto', length: 1, nullable: true })
  riesgoPuesto: string;

  @Column({ name: 'periodicidad_pago', length: 2, default: '04' })
  periodicidadPago: string;

  @Column({ name: 'banco', length: 3, nullable: true })
  banco: string;

  @Column({ name: 'cuenta_bancaria', length: 18, nullable: true })
  cuentaBancaria: string;

  @Column({ name: 'salario_base_cot_apor', type: 'decimal', precision: 12, scale: 2, nullable: true })
  salarioBaseCotApor: number;

  @Column({ name: 'salario_diario_integrado', type: 'decimal', precision: 12, scale: 2, nullable: true })
  salarioDiarioIntegrado: number;

  @Column({ name: 'clave_ent_fed', length: 3, default: 'GUA' })
  claveEntFed: string;
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