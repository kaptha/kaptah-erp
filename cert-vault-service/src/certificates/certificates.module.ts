import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FielCertificate, CsdCertificate, FielUsageLog, CsdUsageLog } from '../entities';
import { FielService } from './fiel.service';
import { CsdService } from './csd.service';
import { FielCryptoService } from './fiel-crypto.service';
import { CertificatesController } from './certificates.controller';
import { InternalFielController } from './internal-fiel.controller';
import { FirebaseAdminConfig } from '../auth/firebase-admin.config';
import { AuthModule } from '../auth/auth.module';
import { ServiceTokenGuard } from '../auth/guards/service-token.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FielCertificate,
      CsdCertificate,
      FielUsageLog,
      CsdUsageLog
    ]),
    ConfigModule,
    AuthModule
  ],
  providers: [FielService, CsdService, FirebaseAdminConfig, FielCryptoService, ServiceTokenGuard],
  controllers: [CertificatesController, InternalFielController],
  exports: [FielService, CsdService],
})
export class CertificatesModule {}
