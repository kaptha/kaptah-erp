import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeliveryNotesController } from './delivery-notes.controller';
import { DeliveryNotesService } from './delivery-notes.service';
import { DeliveryNote } from './entities/delivery-note.entity';
import { SucursalesModule } from '../sucursales/sucursales.module';
import { EmailClientModule } from '../email-client/email-client.module';
import { LogoClientModule } from '../logo-client/logo-client.module';
import { QueueClientModule } from '../queue-client/queue-client.module';
@Module({
  imports: [TypeOrmModule.forFeature([DeliveryNote]), QueueClientModule, SucursalesModule, EmailClientModule, LogoClientModule],
  controllers: [DeliveryNotesController],
  providers: [DeliveryNotesService],
  exports: [DeliveryNotesService]
})
export class DeliveryNotesModule {}
