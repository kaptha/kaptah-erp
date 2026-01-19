import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
  }));
  
  // Configuración de Swagger
  const config = new DocumentBuilder()
    .setTitle('Finance API')
    .setDescription('API para gestión de cuentas por pagar y cobrar')
    .setVersion('1.0')
    .addTag('finance')
    .addBearerAuth()
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);
  
  // Configuración CORS
  app.enableCors({
    origin: [
      'http://localhost:4200',
      'http://localhost:4000',
      'http://localhost:3000',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  
  await app.listen(3003); // ✅ Cambiar a 3003
  console.log('🚀 Finance API running on: http://localhost:3003');
  console.log('📊 Swagger docs: http://localhost:3003/api');
}
bootstrap();
