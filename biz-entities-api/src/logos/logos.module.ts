import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { ConfigModule } from '@nestjs/config';
import { LogosController } from './logos.controller';
import { LogosService } from './logos.service';
import { Logo } from './entities/logo.entity';
import { UsersModule } from '../users/users.module';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Logo]),
    MulterModule.register({
      dest: './uploads/logos',
    }),
    ConfigModule,
    UsersModule,
    CloudinaryModule,
  ],
  controllers: [LogosController],
  providers: [LogosService],
  exports: [LogosService],
})
export class LogosModule {}