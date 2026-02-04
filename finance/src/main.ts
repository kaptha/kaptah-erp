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
  
  // ConfiguraciÃ³n de Swagger
  const config = new DocumentBuilder()
    .setTitle('Finance API')
    .setDescription('API para gestiÃ³n de cuentas por pagar y cobrar')
    .setVersion('1.0')
    .addTag('finance')
    .addBearerAuth()
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);
  
  // ConfiguraciÃ³n CORS
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
  
  await app.listen(3003); // âœ… Cambiar a 3003
  console.log('ðŸš€ Finance API running on: http://localhost:3003');
  console.log('ðŸ“Š Swagger docs: http://localhost:3003/api');
}
bootstrap();
