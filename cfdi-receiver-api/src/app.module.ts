import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseModule } from './database/database.module';
import { FirebaseModule } from './firebase/firebase.module';
import { AuthModule } from './auth/auth.module';
import { XmlModule } from './xml/xml.module';
import { SatDescargaModule } from './sat-descarga/nest/sat-descarga.module';
import configuration from './config/configuration';
import { validate } from './config/validation.schema';
import { CfdiPayableController } from './controllers/cfdi-payable.controller';
import { CfdiPayableService } from './services/cfdi-payable.service';
import { XmlRecibido } from './xml/entities/xml-recibido.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate,
    }),
    // Un solo scheduler para toda la app
    ScheduleModule.forRoot(),
    DatabaseModule,
    AuthModule,
    FirebaseModule,
    XmlModule,
    SatDescargaModule,
    TypeOrmModule.forFeature([XmlRecibido]),
  ],
  controllers: [
    CfdiPayableController,
  ],
  providers: [
    CfdiPayableService,
  ],
})
export class AppModule {}
