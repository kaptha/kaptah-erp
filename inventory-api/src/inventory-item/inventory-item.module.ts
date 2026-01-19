import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { InventoryItemController } from './inventory-item.controller';
import { InventoryItemService } from './inventory-item.service';
import { InventoryItem } from './entities/inventory-item.entity';
import { Product } from '../product/entities/product.entity';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([InventoryItem, Product], 'inventory'),
    UsersModule,
    AuthModule
  ],
  controllers: [InventoryItemController],
  providers: [InventoryItemService],
  exports: [InventoryItemService]
})
export class InventoryItemModule {}
