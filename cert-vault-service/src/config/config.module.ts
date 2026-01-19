import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './configuration';
import * as Joi from 'joi';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [configuration],
      validationSchema: Joi.object({
        PORT: Joi.number().default(3000),
        
        // Database
        DATABASE_HOST: Joi.string().required(),
        DATABASE_PORT: Joi.number().default(5432),
        DATABASE_USER: Joi.string().required(),
        DATABASE_PASSWORD: Joi.string().required(),
        DATABASE_NAME: Joi.string().required(),
        DATABASE_SCHEMA: Joi.string().default('public'),
        DATABASE_SSL: Joi.boolean().default(false),
        
        // JWT
        JWT_SECRET: Joi.string().required(),
        
        // Firebase (opcional si usas autenticación de Firebase)
        FIREBASE_PROJECT_ID: Joi.string().optional(),
        FIREBASE_PRIVATE_KEY: Joi.string().optional(),
        FIREBASE_CLIENT_EMAIL: Joi.string().optional(),
        FIREBASE_AUTH_URI: Joi.string().optional(),
        FIREBASE_TOKEN_URI: Joi.string().optional(),
        FIREBASE_AUTH_PROVIDER_X509_CERT_URL: Joi.string().optional(),
        FIREBASE_CLIENT_X509_CERT_URL: Joi.string().optional(),
        
        // Certificados y Encriptación
        CERT_ENCRYPTION_KEY: Joi.string().required(),
        CERT_ENCRYPTION_ALGORITHM: Joi.string().default('aes-256-gcm'),
        PBKDF2_ITERATIONS: Joi.number().default(100000),
        PBKDF2_KEYLEN: Joi.number().default(64),
        PBKDF2_DIGEST: Joi.string().default('sha512'),
        
        // Almacenamiento
        MAX_CERT_FILE_SIZE: Joi.number().default(5242880),
        CERT_EXPIRATION_DAYS: Joi.number().default(180),
        
        // Seguridad
        MAX_PASSWORD_ATTEMPTS: Joi.number().default(5),
        PASSWORD_LOCKOUT_TIME: Joi.number().default(30),
        RATE_LIMIT_WINDOW_MS: Joi.number().default(900000),
        RATE_LIMIT_MAX: Joi.number().default(100),
        CORS_ORIGIN: Joi.string().default('http://localhost:4200'),
      }),
      validationOptions: {
        abortEarly: true,
      },
    }),
  ],
  exports: [ConfigModule],
})
export class AppConfigModule {}