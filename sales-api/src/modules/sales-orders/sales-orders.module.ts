import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SalesOrdersController } from './sales-orders.controller';
import { SalesOrdersService } from './sales-orders.service';
import { SalesOrder } from './entities/sales-order.entity';
import { SucursalesModule } from '../sucursales/sucursales.module';
import { UsuariosModule } from '../usuarios/usuarios.module';
import { EmailClientModule } from '../email-client/email-client.module';
import { LogoClientModule } from '../logo-client/logo-client.module';
import { QueueClientModule } from '../queue-client/queue-client.module';
@Module({
  imports: [TypeOrmModule.forFeature([SalesOrder]), QueueClientModule, SucursalesModule, UsuariosModule, EmailClientModule, LogoClientModule],
  controllers: [SalesOrdersController],
  providers: [SalesOrdersService],
  exports: [SalesOrdersService]
})
export class SalesOrdersModule {}
