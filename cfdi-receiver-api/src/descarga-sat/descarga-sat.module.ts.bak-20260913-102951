import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ScheduleModule } from '@nestjs/schedule';
import { DescargaSatService } from './descarga-sat.service';
import { DescargaSatSyncService } from './descarga-sat-sync.service';
import { DescargaSatController } from './descarga-sat.controller';
import { XmlModule } from '../xml/xml.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    HttpModule.register({
      timeout: 60000,
      maxRedirects: 3,
    }),
    ScheduleModule.forRoot(),
    XmlModule,
    AuthModule,
  ],
  controllers: [DescargaSatController],
  providers: [DescargaSatService, DescargaSatSyncService],
  exports: [DescargaSatService],
})
export class DescargaSatModule {}