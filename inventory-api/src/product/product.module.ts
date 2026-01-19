import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';
import { Product } from './entities/product.entity';
import { UsersModule } from '../users/users.module';
import { SatCatalogModule } from '../common/modules/sat-catalog/sat-catalog.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product], 'inventory'),
    UsersModule,
    SatCatalogModule,
    AuthModule
  ],
  controllers: [ProductController],
  providers: [ProductService],
  exports: [ProductService]
})
export class ProductModule {}
