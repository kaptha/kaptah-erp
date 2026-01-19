import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DesignSettings } from './entities/design-settings.entity';
import { DesignSettingsService } from './design-settings.service';
import { DesignSettingsController } from './design-settings.controller';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([DesignSettings]),
    UsersModule // Importa el módulo de usuarios para usar UsersService
  ],
  controllers: [DesignSettingsController],
  providers: [DesignSettingsService],
  exports: [DesignSettingsService],
})
export class DesignSettingsModule {}