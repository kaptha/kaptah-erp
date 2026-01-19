import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseModule } from './database/database.module';
import { AccountsPayableModule } from './accounts-payable/accounts-payable.module';
import { AccountsReceivableModule } from './accounts-receivable/accounts-receivable.module';
import { AuthModule } from './auth/auth.module';
import { FirebaseModule } from './firebase/firebase.module';
import { PaymentsModule } from './payments/payments.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { ReportsModule } from './reports/reports.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
// ✅ Importar la entidad Client para MySQL
import { Client } from './shared/entities/client.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: ['.env.development', '.env'],
    }),
    DatabaseModule, // Tu módulo de base de datos existente (PostgreSQL)
    
    // ✅ NUEVA: Conexión adicional a MySQL para clientes
    TypeOrmModule.forRootAsync({
      name: 'mysql', // Nombre de la conexión
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get('MYSQL_HOST') || 'localhost',
        port: configService.get('MYSQL_PORT') || 3306,
        username: configService.get('MYSQL_USER') || 'root',
        password: configService.get('MYSQL_PASSWORD'),
        database: configService.get('MYSQL_DB') || 'biz_entities_db',
        entities: [Client], // Solo la entidad Client
        synchronize: false, // No sincronizar (base de datos existente)
        logging: configService.get('NODE_ENV') === 'development',
        timezone: '+00:00',
        charset: 'utf8mb4',
      }),
      inject: [ConfigService],
    }),
    
    AccountsPayableModule,
    AccountsReceivableModule,
    PaymentsModule,
    AuthModule,
    FirebaseModule,
    IntegrationsModule,
    ReportsModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
