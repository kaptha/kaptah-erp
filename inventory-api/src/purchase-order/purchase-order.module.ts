import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PurchaseOrderService } from './purchase-order.service';
import { PurchaseOrderController } from './purchase-order.controller';
import { PurchaseOrder } from './entities/purchase-order.entity';
import { PurchaseOrderItem } from './entities/purchase-order-item.entity';
import { Product } from '../product/entities/product.entity';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { EmailClientModule } from '../email-client/email-client.module';
@Module({
  imports: [
    TypeOrmModule.forFeature(
      [PurchaseOrder, PurchaseOrderItem, Product],
      'inventory' // ← IMPORTANTE: Especificar la conexión
    ),
    AuthModule,
    UsersModule,
    EmailClientModule,
  ],
  controllers: [PurchaseOrderController],
  providers: [PurchaseOrderService],
  exports: [PurchaseOrderService],
})
export class PurchaseOrderModule {}