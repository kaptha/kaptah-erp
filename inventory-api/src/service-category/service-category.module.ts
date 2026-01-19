import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { ServiceCategory } from './entities/service-category.entity';
import { ServiceCategoryController } from './service-category.controller';
import { ServiceCategoryService } from './service-category.service';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ServiceCategory], 'inventory'),
    UsersModule,
    AuthModule
  ],
  controllers: [ServiceCategoryController],
  providers: [ServiceCategoryService],
  exports: [ServiceCategoryService],
})
export class ServiceCategoryModule {}
