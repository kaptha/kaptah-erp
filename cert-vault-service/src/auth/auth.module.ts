import { Module } from '@nestjs/common';
import { FirebaseAdminConfig } from './firebase-admin.config';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  providers: [FirebaseAdminConfig],
  exports: [FirebaseAdminConfig],
})
export class AuthModule {}