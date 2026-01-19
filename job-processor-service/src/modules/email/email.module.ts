import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { EmailController } from './email.controller';
import { EmailService } from './email.service';
import { EmailProcessor } from './email.processor';
import { EmailLog } from './entities/email-log.entity';
import { EmailAttachment } from './entities/email-attachment.entity';
import { ScheduledEmail } from './entities/scheduled-email.entity';
import { ProvidersModule } from '../providers/providers.module';
import { TemplatesModule } from '../templates/templates.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([EmailLog, EmailAttachment, ScheduledEmail]),
    BullModule.registerQueue({
      name: 'email',
    }),
    ProvidersModule,
    TemplatesModule,
  ],
  controllers: [EmailController],
  providers: [EmailService, EmailProcessor],
  exports: [EmailService],
})
export class EmailModule {}