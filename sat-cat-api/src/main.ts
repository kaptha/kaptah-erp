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

  // Iniciar microservicios
  await app.startAllMicroservices();
  app.enableCors();
  // Iniciar servidor HTTP
  await app.listen(3001);
  
  console.log(`Application is running on: ${await app.getUrl()}`);
}

bootstrap();
