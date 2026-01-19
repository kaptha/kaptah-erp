import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { EmailTracking } from '../../tracking/entities/email-tracking.entity';
import { EmailAttachment } from './email-attachment.entity';

@Entity('email_logs')
@Index(['userId', 'organizationId'])
@Index(['status'])
@Index(['createdAt'])
export class EmailLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'organization_id' })
  organizationId: string;

  @Column({ name: 'email_type' })
  emailType: string;

  @Column()
  recipient: string;

  @Column({ length: 500 })
  subject: string;

  @Column({ name: 'template_used', nullable: true })
  templateUsed: string;

  @Column({ default: 'queued' })
  status: string; // queued, sent, failed, bounced

  @Column()
  provider: string; // sendgrid, resend

  @Column({ name: 'provider_message_id', nullable: true })
  providerMessageId: string;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string;

  @Column({ name: 'retry_count', default: 0 })
  retryCount: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'sent_at', type: 'timestamp', nullable: true })
  sentAt: Date;

  @OneToMany(() => EmailTracking, (tracking) => tracking.emailLog)
  tracking: EmailTracking[];

  @OneToMany(() => EmailAttachment, (attachment) => attachment.emailLog)
  attachments: EmailAttachment[];
}