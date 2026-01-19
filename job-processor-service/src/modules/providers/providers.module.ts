import { Module } from '@nestjs/common';
import { SendgridService } from './sendgrid.service';
import { ResendService } from './resend.service';

@Module({
  providers: [SendgridService, ResendService],
  exports: [SendgridService, ResendService],
})
export class ProvidersModule {}