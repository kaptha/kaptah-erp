import { Module } from '@nestjs/common';
import { LogoClientService } from './logo-client.service';

@Module({
  providers: [LogoClientService],
  exports: [LogoClientService],
})
export class LogoClientModule {}