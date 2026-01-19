import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { EmailLog } from '../modules/email/entities/email-log.entity';
import { EmailAttachment } from '../modules/email/entities/email-attachment.entity';
import { ScheduledEmail } from '../modules/email/entities/scheduled-email.entity';
import { EmailTracking } from '../modules/tracking/entities/email-tracking.entity';

config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT, 10) || 5432,
  username: process.env.DATABASE_USER || 'postgres',
  password: process.env.DATABASE_PASSWORD || 'postgres123',
  database: process.env.DATABASE_NAME || 'email_service',
  entities: [EmailLog, EmailAttachment, ScheduledEmail, EmailTracking],
  migrations: ['src/database/migrations/*.ts'],
  synchronize: false, // Usar migraciones en producción
  logging: process.env.NODE_ENV === 'development',
});