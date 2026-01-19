import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SchedulerService } from './scheduler.service';
import { ScheduledEmail } from '../email/entities/scheduled-email.entity';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [TypeOrmModule.forFeature([ScheduledEmail]), EmailModule],
  providers: [SchedulerService],
})
export class SchedulerModule {}