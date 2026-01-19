import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsuariosModule } from '../usuarios/usuarios.module'; 
import { Cotizacion } from './entities/cotizacion.entity';
import { CotizacionItem } from './entities/cotizacion-item.entity';
import { CotizacionesController } from './cotizaciones.controller';
import { CotizacionesService } from './cotizaciones.service';
import { SucursalesModule } from '../sucursales/sucursales.module';
import { EmailClientModule } from '../email-client/email-client.module';
import { LogoClientModule } from '../logo-client/logo-client.module';
import { QueueClientModule } from '../queue-client/queue-client.module';
@Module({
  imports: [TypeOrmModule.forFeature([Cotizacion, CotizacionItem]), QueueClientModule, SucursalesModule, UsuariosModule, EmailClientModule, LogoClientModule,],
  controllers: [CotizacionesController],
  providers: [CotizacionesService],
})
export class CotizacionesModule {}
