import { IsString, IsNumber, validateSync } from 'class-validator';
import { plainToClass } from 'class-transformer';

export class EnvironmentVariables {
  @IsNumber()
  PORT: number;

  // ✅ PostgreSQL (Existente)
  @IsString()
  DATABASE_HOST: string;

  @IsNumber()
  DATABASE_PORT: number;

  @IsString()
  DATABASE_USER: string;

  @IsString()
  DATABASE_PASSWORD: string;

  @IsString()
  DATABASE_NAME: string;

  // ✨ MySQL (NUEVO)
  @IsString()
  MYSQL_HOST: string;

  @IsNumber()
  MYSQL_PORT: number;

  @IsString()
  MYSQL_USER: string;

  @IsString()
  MYSQL_PASSWORD: string;

  @IsString()
  MYSQL_DB: string;

  // JWT
  @IsString()
  JWT_SECRET: string;

  // Firebase
  @IsString()
  FIREBASE_PROJECT_ID: string;

  @IsString()
  FIREBASE_PRIVATE_KEY: string;

  @IsString()
  FIREBASE_CLIENT_EMAIL: string;

  @IsString()
  FIREBASE_AUTH_URI: string;

  @IsString()
  FIREBASE_TOKEN_URI: string;

  @IsString()
  FIREBASE_AUTH_PROVIDER_X509_CERT_URL: string;

  @IsString()
  FIREBASE_CLIENT_X509_CERT_URL: string;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToClass(
    EnvironmentVariables,
    config,
    { enableImplicitConversion: true }
  );

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }
  return validatedConfig;
}