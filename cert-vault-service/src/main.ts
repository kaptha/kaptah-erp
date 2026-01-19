import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import * as compression from 'compression';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  app.use((req, res, next) => {
    console.log(`📥 Request recibido: ${req.method} ${req.url}`);
    console.log(`📍 Origin: ${req.headers.origin}`);
    console.log(`🎫 Auth: ${req.headers.authorization?.substring(0, 30)}...`);
    next();
  });

  // Configuración de seguridad básica
  app.use(helmet());
  app.use(compression());

  // Configuración de CORS
  app.enableCors({
  origin: (origin, callback) => {
    const allowedOrigins = [
      'http://localhost:4200',  // Frontend
      'http://localhost:4000',  // Sales API
    ];
    
    // Permitir requests sin origin (como Postman o backend-to-backend)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Firebase-Token'],
});

  // Validación global
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    transformOptions: {
      enableImplicitConversion: true,
    },
    forbidNonWhitelisted: true,
    disableErrorMessages: process.env.NODE_ENV === 'production',
  }));

  // Prefijo global para la API
  app.setGlobalPrefix('api');

  // Configuración de Swagger
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Certificados API')
      .setDescription('API para gestión de certificados FIEL y CSD')
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  // Configuración de límites para archivos
  app.use(compression());
  app.use((req: any, res: any, next: any) => {
    req.setTimeout(300000); // 5 minutos
    res.setTimeout(300000);
    next();
  });

  // Puerto desde configuración
  const port = configService.get('PORT', 3004);
  await app.listen(port);
  
  console.log(`Application running on port ${port}`);
  if (process.env.NODE_ENV !== 'production') {
    console.log(`Swagger documentation available at http://localhost:${port}/api/docs`);
  }
}

bootstrap().catch(err => {
  console.error('Error starting the application:', err);
  process.exit(1);
});
