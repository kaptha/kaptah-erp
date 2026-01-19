import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { ServiceController } from './service.controller';
import { ServiceService } from './service.service';
import { Service } from './entities/service.entity';
import { UsersModule } from '../users/users.module';
import { SatCatalogModule } from '../common/modules/sat-catalog/sat-catalog.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Service], 'inventory'),
    UsersModule,
    SatCatalogModule,
    AuthModule
  ],
  controllers: [ServiceController],
  providers: [ServiceService],
  exports: [ServiceService]
})
export class ServiceModule {}
