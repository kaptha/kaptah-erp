import { Module } from '@nestjs/common';
import { SalesApiModule } from './sales-api/sales-api.module';

@Module({
  imports: [SalesApiModule],
  exports: [SalesApiModule],
})
export class IntegrationsModule {}

