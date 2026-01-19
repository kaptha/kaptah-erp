import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { CsdUsageLog } from './csd-usage-log.entity';

@Entity('csd_certificates')
export class CsdCertificate {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'user_id', type: 'varchar' })
    userId: string;

    @Column({ name: 'certificate_number', length: 100 })
    certificateNumber: string;

    @Column({ name: 'serial_number', length: 100 })
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

    @Column({ name: 'password_hash' })
    passwordHash: string;

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

    @Column({ name: 'cer_pem', type: 'text' })
    cerPem: string;

    @Column({ name: 'key_pem', type: 'text' })
    keyPem: string;

    @Column({ name: 'cer_base64', type: 'text' })
    cerBase64: string;

    @Column({ name: 'key_base64', type: 'text' })
    keyBase64: string;

    @OneToMany(() => CsdUsageLog, log => log.csd)
    usageLogs: CsdUsageLog[];
}