import './firebase/firebase-admin';
import { join } from 'path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  
  // Configuración de CORS - ÚNICA Y LIMPIA
  app.enableCors({
    origin: [
      'http://localhost:4200',
      'http://127.0.0.1:4200',
      'https://app.kaptah.mx',
      'https://kaptah.mx',
      'https://www.kaptah.mx',
      /https:\/\/.*\.vercel\.app$/
    ],
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization', 'X-Firebase-Token'],
    credentials: true,
    exposedHeaders: ['Content-Disposition'],
    preflightContinue: false,
    optionsSuccessStatus: 204
  });

  // Configurar carpeta de archivos estáticos (SIN headers CORS manuales)
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads',
  });

  const configService = app.get(ConfigService);

  // Aplicar ValidationPipe globalmente
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  // Configurar el prefijo global de la API
  app.setGlobalPrefix('api');

  // Obtener el puerto desde las variables de entorno
  const port = configService.get<number>('PORT') || 3000;
  await app.listen(port);
  
  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
