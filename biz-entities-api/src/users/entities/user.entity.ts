import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { UserEntityRelation } from '../../user-entity-relations/entities/user-entity-relation.entity';
import { Client } from '../../clients/entities/client.entity';
import { Branch } from 'src/branches/entities/branch.entity';
import { Tax } from 'src/taxes/entities/tax.entity';
import { Employee } from '../../employees/entities/employee.entity';
import { Supplier } from '../../suppliers/entities/supplier.entity';
@Entity('usuarios')
export class User {
  @PrimaryGeneratedColumn()
  ID: number;

  @Column({ unique: true })
  email: string;

  @Column({ unique: true })
  firebaseUid: string;

  @Column({ unique: true, nullable: true })
  realtimeDbKey: string;

  @Column()
  nombre: string;

  @Column({ nullable: true })
  nombreComercial: string;

   @Column({ type: 'enum', enum: ['fisica', 'moral'], default: 'fisica' })
  tipo_persona: 'fisica' | 'moral';

  @Column({ unique: true, length: 13 })
  rfc: string;

  @Column({ nullable: true, length: 10 })
  fiscalReg: string;
 
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  Fecha_Registro: Date;

  @OneToMany(() => Client, (client) => client.user)
  clients: Client[];

  @OneToMany(() => Branch, (branch) => branch.user)
  branches: Branch[];

  @OneToMany(() => Tax, (tax) => tax.user)
  taxes: Tax[];

  @Column({ nullable: true }) 
  telefono: string;

  @OneToMany(() => UserEntityRelation, (relation) => relation.usuario)
  entidadesRelacionadas: UserEntityRelation[];

  @OneToMany(() => Employee, (employee) => employee.user)
employees: Employee[];

@OneToMany(() => Supplier, (supplier) => supplier.user)
suppliers: Supplier[];

@Column({ 
  type: 'text', 
  nullable: true,
  name: 'terminos_condiciones_cotizacion'
})
terminos_condiciones_cotizacion: string;

}