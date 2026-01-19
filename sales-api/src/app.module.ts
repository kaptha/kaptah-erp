import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { validate } from './config/validation.schema';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SalesOrdersModule } from './modules/sales-orders/sales-orders.module';
import { DeliveryNotesModule } from './modules/delivery-notes/delivery-notes.module';
import { SaleNotesModule } from './modules/sale-notes/sale-notes.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { ReportsModule } from './modules/reports/reports.module';
import { FirebaseModule } from './firebase/firebase.module';
import { TimbradoModule } from './modules/timbrado/timbrado.module';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { CfdiModule } from './modules/cfdi/cfdi.module';
import { CotizacionesModule } from './modules/cotizaciones/cotizaciones.module';
import { PdfModule } from './modules/pdf/pdf.module';
import { SucursalesModule } from './modules/sucursales/sucursales.module';
import { UsuariosModule } from './modules/usuarios/usuarios.module';
import { EmailClientModule } from './modules/email-client/email-client.module';
import { QueueClientModule } from './modules/queue-client/queue-client.module';
@Module({
  imports: [
    // Core Modules - Fundamental functionality
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate,
      cache: true,
      envFilePath: ['.env.development', '.env'],
    }),
    DatabaseModule,
    FirebaseModule,
    AuthModule,

    // Feature Modules - Business logic
    CfdiModule,
    TimbradoModule,
    SalesOrdersModule, 
    DeliveryNotesModule, 
    SaleNotesModule, 
    PaymentsModule, 
    ReportsModule,
    CotizacionesModule,
    PdfModule,
    SucursalesModule, 
    UsuariosModule,
    EmailClientModule,
    QueueClientModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
