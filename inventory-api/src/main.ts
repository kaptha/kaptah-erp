import './firebase/firebase.config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Obtener y parsear los orígenes permitidos desde las variables de entorno
  const allowedOrigins = configService
    .get<string>('ALLOWED_ORIGINS')
    ?.split(',') || ['http://localhost:4200'];

  // Configuración de CORS con múltiples orígenes
  app.enableCors({
    origin: allowedOrigins,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: 'Content-Type, Accept, Authorization',
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
    // Tags para Inventario
    .addTag('categories', 'Category management endpoints')
    .addTag('products', 'Product management endpoints')
    .addTag('inventory', 'Inventory management endpoints')
    // Tags para Servicios
    .addTag('services', 'Services management endpoints')
    .addTag('service-categories', 'Service categories management endpoints')
    .addTag('service-prices', 'Service pricing management endpoints')
    .addTag('service-providers', 'Service providers management endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  // Configuración personalizada de Swagger UI
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

  // Puerto de la aplicación
  const port = configService.get<number>('PORT') || 4005;
  const nodeEnv = configService.get<string>('NODE_ENV') || 'development';

  await app.listen(port);
  console.log(`Application is running in ${nodeEnv} mode`);
  console.log(`Server running on: ${await app.getUrl()}`);
  console.log(`Swagger documentation available at: ${await app.getUrl()}/docs`);

  // Log de orígenes permitidos en modo desarrollo
  if (nodeEnv === 'development') {
    console.log('Allowed origins:', allowedOrigins);
  }
}

bootstrap();
