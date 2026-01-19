import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { EmailLog } from '../../email/entities/email-log.entity';

@Entity('email_tracking')
@Index(['emailLogId'])
@Index(['eventType'])
export class EmailTracking {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'email_log_id' })
  emailLogId: string;

  @ManyToOne(() => EmailLog, (emailLog) => emailLog.tracking)
  @JoinColumn({ name: 'email_log_id' })
  emailLog: EmailLog;

  @Column({ name: 'event_type' })
  eventType: string; // delivered, opened, clicked, bounced, spam_report

  @Column({ type: 'jsonb', nullable: true })
  eventData: Record<string, any>;

  @Column({ name: 'ip_address', nullable: true })
  ipAddress: string;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}