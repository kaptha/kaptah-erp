import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { ScheduleModule } from '@nestjs/schedule';
import configuration from './config/configuration';

// Entities
import { EmailLog } from './modules/email/entities/email-log.entity';
import { EmailAttachment } from './modules/email/entities/email-attachment.entity';
import { ScheduledEmail } from './modules/email/entities/scheduled-email.entity';
import { EmailTracking } from './modules/tracking/entities/email-tracking.entity';

// Modules
import { EmailModule } from './modules/email/email.module';
import { ProvidersModule } from './modules/providers/providers.module';
import { TemplatesModule } from './modules/templates/templates.module';
import { TrackingModule } from './modules/tracking/tracking.module';
import { SchedulerModule } from './modules/scheduler/scheduler.module';

// Controllers y Services
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    // Configuración
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: '.env',
    }),

    // TypeORM - PostgreSQL
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('database.host'),
        port: configService.get('database.port'),
        username: configService.get('database.username'),
        password: configService.get('database.password'),
        database: configService.get('database.database'),
        entities: [EmailLog, EmailAttachment, ScheduledEmail, EmailTracking],
        synchronize: configService.get('nodeEnv') === 'development', // Solo en desarrollo
        logging: configService.get('nodeEnv') === 'development',
        ssl:
          configService.get('nodeEnv') === 'production'
            ? { rejectUnauthorized: false }
            : false,
      }),
      inject: [ConfigService],
    }),

    // BullMQ - Redis para colas
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: configService.get('redis.host'),
          port: configService.get('redis.port'),
        },
      }),
      inject: [ConfigService],
    }),

    // Módulo de Schedule para cron jobs
    ScheduleModule.forRoot(),

    // Módulos de la aplicación
    EmailModule,
    ProvidersModule,
    TemplatesModule,
    TrackingModule,
    SchedulerModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
