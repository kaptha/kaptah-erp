import './firebase/firebase.config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Middleware manual para preflight - ANTES de enableCors
  app.use((req, res, next) => {
    const allowedOrigins = [
      'http://localhost:4200',
      'http://127.0.0.1:4200',
      'https://app.kaptah.mx',
    ];
    const origin = req.headers.origin;
    
    if (allowedOrigins.includes(origin) || /https:\/\/.*\.vercel\.app$/.test(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization, X-Firebase-Token');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
    }

    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }

    next();
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
    allowedHeaders: ['Content-Type', 'Accept', 'Authorization', 'X-Firebase-Token'],
    exposedHeaders: ['Content-Disposition']
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
  
  console.log(`Application is running in ${nodeEnv} mode`);
  console.log(`Server running on: http://localhost:${port}`);
  console.log(`Swagger documentation available at: http://localhost:${port}/docs`);
}

bootstrap();
