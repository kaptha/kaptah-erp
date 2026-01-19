import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DatabaseService } from './database.service';
import { SaleNote } from '../modules/sale-notes/entities/sale-note.entity';
import { SalesOrder } from 'src/modules/sales-orders/entities/sales-order.entity';
import { Cotizacion } from 'src/modules/cotizaciones/entities/cotizacion.entity';
import { DeliveryNote } from 'src/modules/delivery-notes/entities/delivery-note.entity';
import { CotizacionItem } from 'src/modules/cotizaciones/entities/cotizacion-item.entity';
import { Usuario } from '../modules/usuarios/entities/usuario.entity'; 
import { Cfdi } from 'src/modules/cfdi/entities/cfdi.entity';

@Global()
@Module({
  imports: [
    // Conexión PostgreSQL (Principal)
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('database.host'),
        port: configService.get('database.port'),
        username: configService.get('database.username'),
        password: configService.get('database.password'),
        database: configService.get('database.database'),
        entities: [SaleNote, SalesOrder, Cotizacion, DeliveryNote, CotizacionItem, Cfdi], // 👈 CAMBIAR: Dejar vacío o especificar solo entities de Postgres
        synchronize: false,
        autoLoadEntities: false, // 👈 CAMBIAR a false
        logging: process.env.NODE_ENV === 'development',
      }),
    }),
    
    // Conexión MySQL (Secundaria)
    TypeOrmModule.forRootAsync({
      name: 'mysql',
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get('mysql.host'),
        port: configService.get('mysql.port'),
        username: configService.get('mysql.username'),
        password: configService.get('mysql.password'),
        database: configService.get('mysql.database'),
        entities: [Usuario], // 👈 Solo entities de MySQL
        synchronize: false,
        logging: true,
      }),
    }),
  ],
  providers: [DatabaseService],
  exports: [DatabaseService],
})
export class DatabaseModule {}
