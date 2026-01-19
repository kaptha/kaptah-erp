import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CorsMiddleware } from './common/middlewares/cors.middleware';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { User } from './users/entities/user.entity';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
// Módulos de la aplicación
import { CategoriesModule } from './category/categories.module';
import { ProductModule } from './product/product.module';
import { ServiceModule } from './service/service.module';
import { InventoryItemModule } from './inventory-item/inventory-item.module';
import { ServiceCategoryModule } from './service-category/service-category.module';
import { SatCatalogService } from './common/services/sat-catalog/sat-catalog.service';
import { SatCatalogModule } from './common/modules/sat-catalog/sat-catalog.module';
import { PurchaseOrderModule } from './purchase-order/purchase-order.module';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    // Conexión principal para acceder a la tabla users de biz_entities
    TypeOrmModule.forRootAsync({
      name: 'default',
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get('DB_HOST'),
        port: +configService.get<number>('DB_PORT'),
        username: configService.get('DB_USERNAME'),
        password: configService.get('DB_PASSWORD'),
        database: 'biz_entities_db',
        entities: [User],
        synchronize: false,
      }),
      inject: [ConfigService],
    }),

    // Conexión secundaria para las tablas de inventario
    TypeOrmModule.forRootAsync({
      name: 'inventory',
      imports: [ConfigModule, AuthModule],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get('DB_HOST'),
        port: +configService.get<number>('DB_PORT'),
        username: configService.get('DB_USERNAME'),
        password: configService.get('DB_PASSWORD'),
        database: 'inventory_db',
        autoLoadEntities: true, // Esto cargará las entidades automáticamente
        synchronize: false, // Cambiado a false para evitar cambios automáticos
        logging: configService.get('NODE_ENV') === 'development',
      }),
      inject: [ConfigService],
    }),

    // Módulos de la aplicación
    UsersModule,
    CategoriesModule,
    ProductModule,
    ServiceModule,
    InventoryItemModule,
    ServiceCategoryModule,
    SatCatalogModule,
    PurchaseOrderModule,
  ],
  controllers: [AppController],
  providers: [AppService, SatCatalogService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(CorsMiddleware)
      .forRoutes('*');
  }
}