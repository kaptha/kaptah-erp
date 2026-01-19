import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TrackingController } from './tracking.controller';
import { TrackingService } from './tracking.service';
import { EmailTracking } from './entities/email-tracking.entity';
import { EmailLog } from '../email/entities/email-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([EmailTracking, EmailLog])],
  controllers: [TrackingController],
  providers: [TrackingService],
  exports: [TrackingService],
})
export class TrackingModule {}