import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { CsdCertificate } from './csd-certificate.entity';

@Entity('csd_usage_logs')
export class CsdUsageLog {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    csdId: string;

    @Column({ type: 'uuid' })
    userId: string;

    @Column({ name: 'action_type', length: 50 })
    actionType: string;

    @CreateDateColumn({ name: 'action_timestamp', type: 'timestamp with time zone' })
    actionTimestamp: Date;

    @Column({ name: 'ip_address', type: 'inet', nullable: true })
    ipAddress: string;

    @Column({ length: 50 })
    status: string;

    @Column({ length: 36, nullable: true })
    uuid: string;

    @Column({ name: 'invoice_type', length: 10, nullable: true })
    invoiceType: string;

    @Column({ name: 'invoice_amount', type: 'decimal', precision: 20, scale: 6, nullable: true })
    invoiceAmount: number;

    @Column({ name: 'error_message', type: 'text', nullable: true })
    errorMessage: string;

    @Column({ name: 'execution_time', type: 'integer', nullable: true })
    executionTime: number;

    @Column({ name: 'pac_response', type: 'jsonb', nullable: true })
    pacResponse: any;

    @ManyToOne(() => CsdCertificate, csd => csd.usageLogs)
    @JoinColumn({ name: 'csd_id' })
    csd: CsdCertificate;
}