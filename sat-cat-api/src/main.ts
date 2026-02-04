import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';

async function bootstrap() {
  // Crear aplicación HTTP
  const app = await NestFactory.create(AppModule);
  
  // Configurar microservicio TCP
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.TCP,
    options: {
      host: '0.0.0.0',
      port: 3002, // Cambiado a 3002 para el microservicio TCP
    },
  });
  
  // Configurar logger
  app.useLogger(new Logger('debug'));
  
  // Configurar CORS
  app.enableCors({
    origin: [
      'http://localhost:4200',
      'http://127.0.0.1:4200',
      'https://app.kaptah.mx',
      'https://kaptah-git-main-xals-projects.vercel.app',
      'https://kaptah-3w4kxihd3-xals-projects.vercel.app',
      /https:\/\/.*\.vercel\.app$/ // Permite cualquier URL de Vercel
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization', 'X-Firebase-Token'],
    credentials: true,
    exposedHeaders: ['Content-Disposition']
  });
  
  // Iniciar microservicios
  await app.startAllMicroservices();
  
  // Iniciar servidor HTTP
  await app.listen(3001);
  console.log(\Application is running on: \\);
}

bootstrap();
