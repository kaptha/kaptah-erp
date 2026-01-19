import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('scheduled_emails')
@Index(['scheduledFor'])
@Index(['status'])
export class ScheduledEmail {
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

  @Column({ type: 'jsonb' })
  templateData: Record<string, any>;

  @Column({ name: 'scheduled_for', type: 'timestamp' })
  scheduledFor: Date;

  @Column({ nullable: true })
  recurrence: string; // daily, weekly, monthly, null

  @Column({ default: 'pending' })
  status: string; // pending, sent, cancelled

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'processed_at', type: 'timestamp', nullable: true })
  processedAt: Date;
}