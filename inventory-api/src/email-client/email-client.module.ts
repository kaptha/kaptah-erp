import { Module } from '@nestjs/common';
import { EmailClientService } from './email-client.service';

@Module({
  providers: [EmailClientService],
  exports: [EmailClientService],
})
export class EmailClientModule {}