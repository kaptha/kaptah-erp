import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import * as bodyParser from 'body-parser';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('port');
  const nodeEnv = configService.get<string>('nodeEnv');

  // Aumentar límite de body para PDFs grandes
  app.use(bodyParser.json({ limit: '50mb' })); // <-- Agregar
  app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
  // Habilitar CORS
  app.enableCors({
    origin: [
      configService.get<string>('urls.frontend'),
      configService.get<string>('urls.backend'),
      'http://localhost:4200',
      'http://localhost:3000',
      'http://localhost:4000',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Global prefix para todas las rutas
  app.setGlobalPrefix('api/v1');

  // Validación global
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Remueve propiedades no definidas en DTO
      forbidNonWhitelisted: true, // Lanza error si hay propiedades extras
      transform: true, // Transforma los payloads a instancias de DTO
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  await app.listen(port);

  logger.log(`🚀 Email Service running on: http://localhost:${port}/api/v1`);
  logger.log(`📧 Environment: ${nodeEnv}`);
  logger.log(`🔍 Swagger docs: http://localhost:${port}/api/docs`);
}

bootstrap();
