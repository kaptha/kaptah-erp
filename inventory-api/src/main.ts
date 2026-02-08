import './firebase/firebase.config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  
  // Configuración de CORS - MÁS EXPLÍCITA
  app.enableCors({
    origin: function (origin, callback) {
      const allowedOrigins = [
        'http://localhost:4200',
        'http://127.0.0.1:4200',
        'https://app.kaptah.mx'
      ];
      
      // Permitir Vercel deployments
      if (!origin || allowedOrigins.includes(origin) || /https:\/\/.*\.vercel\.app$/.test(origin)) {
        callback(null, true);
      } else {
        callback(null, true); // TEMPORAL: permitir todo para diagnóstico
      }
    },
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Accept', 'Authorization', 'X-Firebase-Token', 'Origin', 'X-Requested-With'],
    exposedHeaders: ['Content-Disposition'],
    preflightContinue: false,
    optionsSuccessStatus: 204,
    maxAge: 86400 // 24 horas de cache para preflight
  });

  // Configuración de Validación Global
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Prefijo global de la API
  app.setGlobalPrefix('api');

  // Configuración de Swagger
  const config = new DocumentBuilder()
    .setTitle('Inventory and Services API')
    .setDescription('API documentation for Inventory and Services Management System')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'access-token',
    )
    .addTag('categories', 'Category management endpoints')
    .addTag('products', 'Product management endpoints')
    .addTag('inventory', 'Inventory management endpoints')
    .addTag('services', 'Services management endpoints')
    .addTag('service-categories', 'Service categories management endpoints')
    .addTag('service-prices', 'Service pricing management endpoints')
    .addTag('service-providers', 'Service providers management endpoints')
    .build();
    
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
      docExpansion: 'none',
      filter: true,
      showRequestDuration: true,
    },
  });

  const port = configService.get<number>('PORT') || 4005;
  const nodeEnv = configService.get<string>('NODE_ENV') || 'development';
  
  await app.listen(port);
  
  console.log(\Application is running in \ mode\);
  console.log(\Server running on: http://localhost:\\);
  console.log(\Swagger documentation available at: http://localhost:\/docs\);
}
bootstrap();
