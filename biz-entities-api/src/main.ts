import './firebase/firebase-admin';
import { join } from 'path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  
  // Configurar carpeta de archivos estáticos
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads',
  });
  
  // Configurar CORS (una sola vez)
  app.enableCors({
    origin: ['http://localhost:4200', 'http://127.0.0.1:4200'], // Incluir ambas variantes
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
    credentials: true,
    exposedHeaders: ['Content-Disposition']
  });
  // Configurar archivos estáticos para permitir CORS
app.useStaticAssets(join(process.cwd(), 'uploads'), {
  prefix: '/uploads',
  setHeaders: (res, path, stat) => {
    res.set('Access-Control-Allow-Origin', 'http://localhost:4200');
    res.set('Access-Control-Allow-Methods', 'GET');
    res.set('Access-Control-Allow-Headers', 'Origin,X-Requested-With,Content-Type,Accept,Authorization');
  }
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
