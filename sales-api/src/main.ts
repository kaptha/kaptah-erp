import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  // Configuración de CORS - ACTUALIZADO
  app.enableCors({
    origin: [
      'http://localhost:4200',
      'http://127.0.0.1:4200',
      'https://app.kaptah.mx',
      'https://kaptah-git-main-xals-projects.vercel.app',
      'https://kaptah-3w4kxihd3-xals-projects.vercel.app',
      /https:\/\/.*\.vercel\.app$/
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Firebase-Token'],
    exposedHeaders: ['Content-Disposition']
  });

  const config = new DocumentBuilder()
    .setTitle('Sales API')
    .setDescription('API Documentation')
    .setVersion('1.0')
    .addTag('Auth', 'Autenticación')
    .addTag('Cfdi', 'Facturación Electrónica')
    .addTag('SalesOrders', 'Órdenes de Venta')
    .addTag('DeliveryNotes', 'Notas de Remisión')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(4000);
}
bootstrap();
