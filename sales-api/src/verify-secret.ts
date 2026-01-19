import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as crypto from 'crypto';

async function verifySecret() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const configService = app.get(ConfigService);
  
  const secret = configService.get<string>('JWT_SECRET');
  const hash = crypto.createHash('sha256').update(secret || '').digest('hex');
  
  console.log('\n=== SALES-API JWT SECRET VERIFICATION ===');
  console.log('JWT_SECRET existe:', !!secret);
  console.log('JWT_SECRET length:', secret?.length || 0);
  console.log('JWT_SECRET primeros 10 chars:', secret?.substring(0, 10) || 'N/A');
  console.log('JWT_SECRET últimos 10 chars:', secret?.substring(secret.length - 10) || 'N/A');
  console.log('JWT_SECRET hash (SHA256):', hash);
  console.log('=========================================\n');
  
  await app.close();
}

verifySecret();