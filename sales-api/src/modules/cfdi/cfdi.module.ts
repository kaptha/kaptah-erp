import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CfdiController } from './cfdi.controller';
import { CfdiService } from './cfdi.service';
import { SignService } from './security/digital-sign/sign.service';
import { OriginalStringService } from './security/digital-sign/original-string.service';
import { CertVaultClientService } from './security/digital-sign/cert-vault-client.service';
import { Cfdi } from './entities/cfdi.entity';
// ⭐ NUEVO: Servicios de timbrado
import { TimbradoService } from './timbrado/timbrado.service';
import { SifeiClientService } from './timbrado/sifei-client.service';
import { XmlTimbreService } from './timbrado/xml-timbre.service';
// ⭐ NUEVOS: Servicios de QR y PDF
import { QrGeneratorService } from './services/qr-generator.service';
import { PdfGeneratorService } from './services/pdf-generator.service';
import { CfdiTemplateService } from './services/cfdi-template.service';
import { QueueClientModule } from '../queue-client/queue-client.module';
@Module({
  imports: [
    // HttpModule para hacer peticiones HTTP al cert-vault-service
    HttpModule.register({
      timeout: 10000, // 10 segundos
      maxRedirects: 5,
    }),
    ConfigModule,
    // TypeORM entities (si usas base de datos)
    TypeOrmModule.forFeature([Cfdi]),
    QueueClientModule,
  ],
  controllers: [CfdiController],
  providers: [
    CfdiService,
    SignService,
    OriginalStringService,
    CertVaultClientService, // ⭐ Cliente para cert-vault-service
    TimbradoService,
    SifeiClientService,
    XmlTimbreService,
    QrGeneratorService,     
    PdfGeneratorService,       
    CfdiTemplateService,
  ],
  exports: [CfdiService],
})
export class CfdiModule {}