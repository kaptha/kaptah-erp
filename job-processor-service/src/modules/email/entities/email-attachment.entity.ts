import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { EmailLog } from './email-log.entity';

@Entity('email_attachments')
export class EmailAttachment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'email_log_id' })
  emailLogId: string;

  @ManyToOne(() => EmailLog, (emailLog) => emailLog.attachments)
  @JoinColumn({ name: 'email_log_id' })
  emailLog: EmailLog;

  @Column()
  filename: string;

  @Column({ name: 'file_size', nullable: true })
  fileSize: number;

  @Column({ name: 'mime_type' })
  mimeType: string;

  @Column({ name: 'storage_path', length: 500, nullable: true })
  storagePath: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}