import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('Proveedores')
export class Supplier {
    @PrimaryGeneratedColumn()
    ID: number;

    // Información básica
    @Column({ length: 100 })
    nombre: string;

    @Column({ length: 150 })
    razon_social: string;

    @Column({ length: 100, unique: true })
    email: string;

    @Column({ length: 20 })
    telefono: string;

    // Información fiscal
    @Column({ length: 13 })
    rfc: string;

    @Column({ length: 50 })
    regimen_fiscal: string;

    @Column({ type: 'enum', enum: ['fisica', 'moral'] })
    tipo_contribuyente: 'fisica' | 'moral';

    // Dirección
    @Column({ length: 5 })
    Cpostal: string;

    @Column({ length: 100 })
    colonia: string; // ← Cambiar a minúscula para consistencia

    @Column({ length: 100 })
    calle: string;

    @Column({ length: 10 })
    numero_ext: string;

    @Column({ length: 10, nullable: true })
    numero_int: string;

    @Column({ length: 100 })
    municipio: string;

    @Column({ length: 100 })
    estado: string;

    // Información bancaria
    @Column({ length: 50 })
    banco: string;

    @Column({ length: 20 })
    cuenta_bancaria: string;

    @Column({ type: 'enum', enum: ['cheques', 'ahorro'] })
    tipo_cuenta: 'cheques' | 'ahorro';

    @Column({ length: 18, nullable: true })
    clabe: string;

    @Column({ length: 100 })
    beneficiario: string;

    // Información comercial
    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    limite_credito: number;

    @Column({ type: 'int', default: 0 })
    dias_credito: number;

    @Column({ length: 50, nullable: true })
    categoria: string;

    @Column({ type: 'text', nullable: true })
    notas: string;

    // Control y seguimiento
    @CreateDateColumn()
    Fecha_Registro: Date;

    @Column({ default: true })
    activo: boolean;

    @Column()
    userId: number;

    @ManyToOne(() => User, (user) => user.suppliers)
    @JoinColumn({ name: 'userId' })
    user: User;
}