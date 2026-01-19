import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DatabaseService } from './database.service';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DATABASE_HOST'),
        port: configService.get<number>('DATABASE_PORT'),
        username: configService.get('DATABASE_USER'),
        password: configService.get('DATABASE_PASSWORD'),
        database: configService.get('DATABASE_NAME'),
        entities: [__dirname + '/../**/*.entity{.ts,.js}'],
        
        // Más control sobre synchronize
        synchronize: configService.get('DATABASE_SYNC') === 'true' || 
                    (configService.get('NODE_ENV') === 'development' && 
                     configService.get('DATABASE_SYNC') !== 'false'),
        
        logging: configService.get('NODE_ENV') === 'development',
        retryAttempts: 3,
        retryDelay: 3000,
        
        // Opciones adicionales para debugging
        dropSchema: configService.get('DATABASE_DROP_SCHEMA') === 'true',
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [DatabaseService],
  exports: [DatabaseService],
})
export class DatabaseModule {}