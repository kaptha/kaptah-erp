import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { FielCertificate } from './fiel-certificate.entity';

@Entity('fiel_usage_logs')
export class FielUsageLog {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    fielId: string;

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

    @Column({ name: 'request_period', length: 50, nullable: true })
    requestPeriod: string;

    @Column({ name: 'request_type', length: 50, nullable: true })
    requestType: string;

    @Column({ name: 'downloaded_files_count', type: 'integer', nullable: true })
    downloadedFilesCount: number;

    @Column({ name: 'error_message', type: 'text', nullable: true })
    errorMessage: string;

    @Column({ name: 'execution_time', type: 'integer', nullable: true })
    executionTime: number;

    @ManyToOne(() => FielCertificate, fiel => fiel.usageLogs)
    @JoinColumn({ name: 'fiel_id' })
    fiel: FielCertificate;
}