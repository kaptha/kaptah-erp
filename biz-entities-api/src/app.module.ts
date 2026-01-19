import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CorsMiddleware } from "./common/middlewares/cors.middleware";
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ClientsModule } from './clients/clients.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { EmployeesModule } from './employees/employees.module';
import { UsersModule } from './users/users.module';
import { User } from './users/entities/user.entity';
import { UserEntityRelationsModule } from './user-entity-relations/user-entity-relations.module';
import { BranchModule } from './branches/branch.module';
import { TaxModule } from './taxes/tax.module';
import { LogosModule } from './logos/logos.module';
import { UploadsModule } from './uploads/uploads.module';
import { DesignSettingsModule } from './design-settings/design-settings.module';
import { UserPostgres } from './users/entities/user.postgres.entity';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get('DB_HOST'),
        port: +configService.get<number>('DB_PORT'),
        username: configService.get('DB_USERNAME'),
        password: configService.get('DB_PASSWORD'),
        database: configService.get('DB_NAME'),
        entities: [__dirname + '/**/*.entity{.ts,.js}', User],
        synchronize: false, // true for development, false for production
        logging: configService.get('NODE_ENV') !== 'production',
      }),
      inject: [ConfigService],
    }),
    //  PostgreSQL
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      name: 'postgres', // Nombre para identificar esta conexión
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('PG_HOST'),
        port: +configService.get<number>('PG_PORT'),
        username: configService.get('PG_USERNAME'),
        password: configService.get('PG_PASSWORD'),
        database: configService.get('PG_DATABASE'),
        entities: [UserPostgres], // Solo incluye las entidades de PostgreSQL
        synchronize: false,
        logging: configService.get('NODE_ENV') !== 'production',
      }),
      inject: [ConfigService],
    }),
    ClientsModule,
    SuppliersModule,
    EmployeesModule,
    UsersModule,
    UserEntityRelationsModule,
    BranchModule,
    TaxModule,
    LogosModule,
    UploadsModule,
    DesignSettingsModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(CorsMiddleware)
      .forRoutes('*');
  }
}