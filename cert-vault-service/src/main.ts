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
    console.log(\🔥 Request recibido: \ \\);
    console.log(\📍 Origin: \\);
    console.log(\🎫 Auth: \...\);
    next();
  });

  // Configuración de seguridad básica
  app.use(helmet());
  app.use(compression());

  // Configuración de CORS - ACTUALIZADO
  app.enableCors({
    origin: [
      'http://localhost:4200',
      'http://127.0.0.1:4200',
      'http://localhost:4000',
      'https://app.kaptah.mx',
      'https://kaptah-git-main-xals-projects.vercel.app',
      'https://kaptah-3w4kxihd3-xals-projects.vercel.app',
      /https:\/\/.*\.vercel\.app$/
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Firebase-Token'],
    exposedHeaders: ['Content-Disposition']
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

  console.log(\Application running on port \\);
  if (process.env.NODE_ENV !== 'production') {
    console.log(\Swagger documentation available at http://localhost:\/api/docs\);
  }
}

bootstrap().catch(err => {
  console.error('Error starting the application:', err);
  process.exit(1);
});
