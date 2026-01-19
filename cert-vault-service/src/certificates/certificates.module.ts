import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FielCertificate, CsdCertificate, FielUsageLog, CsdUsageLog } from '../entities';
import { FielService } from './fiel.service';
import { CsdService } from './csd.service';
import { CertificatesController } from './certificates.controller';
import { FirebaseAdminConfig } from '../auth/firebase-admin.config';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FielCertificate,
      CsdCertificate,
      FielUsageLog,
      CsdUsageLog
    ]),
    AuthModule
  ],
  providers: [FielService, CsdService, FirebaseAdminConfig],
  controllers: [CertificatesController],
  exports: [FielService, CsdService],
})
export class CertificatesModule {}