import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../../auth/auth.module';
import { XmlModule } from '../../xml/xml.module';
import { SatSolicitud } from './entities/sat-solicitud.entity';
import { SatDescargaConfig } from './sat-descarga.config';
import { SatDescargaController } from './sat-descarga.controller';
import { SatDescargaService } from './sat-descarga.service';
import { SatDescargaSyncService } from './sat-descarga-sync.service';

/**
 * Descarga masiva directa del SAT con la FIEL de cada cuenta (sustituye a SIFEI).
 * Requiere ScheduleModule.forRoot() registrado UNA sola vez en AppModule.
 */
@Module({
  imports: [
    ConfigModule,
    HttpModule.register({ timeout: 60_000, maxRedirects: 0 }),
    TypeOrmModule.forFeature([SatSolicitud]),
    XmlModule,
    AuthModule,
  ],
  controllers: [SatDescargaController],
  providers: [SatDescargaConfig, SatDescargaService, SatDescargaSyncService],
  exports: [SatDescargaService],
})
export class SatDescargaModule {}
