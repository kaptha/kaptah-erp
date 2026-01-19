import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { SalesApiService } from './services/sales-api.service';
import { SalesApiController } from './controllers/sales-api.controller';

@Module({
  imports: [
    HttpModule.register({
      timeout: parseInt(process.env.SALES_API_TIMEOUT) || 5000,
      maxRedirects: 5,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        // Si se requiere autenticación por header
        'x-api-key': process.env.SALES_API_API_KEY,
      },
    }),
    ConfigModule,
  ],
  controllers: [SalesApiController],
  providers: [SalesApiService],
  exports: [SalesApiService],
})
export class SalesApiModule {}
