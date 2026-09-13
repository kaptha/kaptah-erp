import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { FielUsageLog } from './fiel-usage-log.entity';

@Entity('fiel_certificates')
export class FielCertificate {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'user_id', type: 'varchar', length: 128 })
    userId: string;

    /** RFC leído del certificado al cargarlo */
    @Column({ name: 'rfc', type: 'varchar', length: 13, nullable: true })
    rfc: string;

    @Column({ name: 'certificate_number', type: 'varchar', length: 100 })
    certificateNumber: string;

    @Column({ name: 'serial_number', type: 'varchar', length: 100 })
    serialNumber: string;

    @Column({ name: 'valid_from' })
    validFrom: string;

    @Column({ name: 'valid_until' })
    validUntil: string;

    @Column()
    status: string;

    @Column({ name: 'cer_file', type: 'bytea' })
    cerFile: Buffer;

    @Column({ name: 'key_file', type: 'bytea' })
    keyFile: Buffer;

    /** bcrypt: solo para verificar que el usuario tecleó bien la contraseña */
    @Column({ name: 'password_hash' })
    passwordHash: string;

    /** AES-256-GCM (FielCryptoService). Solo si el usuario autorizó descarga masiva automática. */
    @Column({ name: 'password_encrypted', type: 'text', nullable: true })
    passwordEncrypted: string | null;

    /** Consentimiento explícito: la contraseña se usará para la descarga masiva del SAT */
    @Column({ name: 'descarga_masiva_autorizada', type: 'boolean', default: false })
    descargaMasivaAutorizada: boolean;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

    @Column({ name: 'last_used_at', nullable: true })
    lastUsedAt: Date;

    @Column({ name: 'issuer_name' })
    issuerName: string;

    @Column({ name: 'issuer_serial' })
    issuerSerial: string;

    @OneToMany(() => FielUsageLog, log => log.fiel)
    usageLogs: FielUsageLog[];
}
