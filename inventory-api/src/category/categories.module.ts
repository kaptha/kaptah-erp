import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { CategoriesService } from './categories.service';
import { CategoriesController } from './categories.controller';
import { ProductCategory, ServiceCategory } from './entities/category.entity';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProductCategory, ServiceCategory], 'inventory'),  // Especificamos la conexión 'inventory'
    UsersModule,
    AuthModule
  ],
  controllers: [CategoriesController],
  providers: [CategoriesService],
  exports: [CategoriesService], // Lo exportamos por si otros módulos necesitan usar el servicio
})
export class CategoriesModule {}
