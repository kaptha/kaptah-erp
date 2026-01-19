import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { CertVaultClientService } from './cert-vault-client.service';

/**
 * Módulo para el cliente del cert-vault-service
 * Proporciona comunicación HTTP con el microservicio de certificados
 */
@Module({
  imports: [
    HttpModule.register({
      timeout: 10000, // 10 segundos timeout
      maxRedirects: 5,
    }),
    ConfigModule,
  ],
  providers: [CertVaultClientService],
  exports: [CertVaultClientService],
})
export class CertVaultClientModule {}