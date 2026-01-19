import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        console.log('🔧 Database Configuration Check:');
        
        // Obtener configuración de base de datos
        const dbConfig = configService.get('database');
        console.log('Database config object:', dbConfig);
        
        // Verificar variables individuales como fallback
        const host = dbConfig?.host || configService.get('DATABASE_HOST') || 'localhost';
        const port = dbConfig?.port || parseInt(configService.get('DATABASE_PORT')) || 5432;
        const username = dbConfig?.username || configService.get('DATABASE_USER') || 'postgres';
        const password = dbConfig?.password || configService.get('DATABASE_PASSWORD') || '';
        const database = dbConfig?.database || configService.get('DATABASE_NAME') || 'cfdi';
        
        console.log('Final database config:', {
          host,
          port,
          username,
          database: database,
          passwordLength: password?.length || 0
        });
        
        return {
          type: 'postgres',
          host: host,
          port: port,
          username: username,
          password: password,
          database: database,
          entities: [__dirname + '/../**/*.entity{.ts,.js}'],
          synchronize: false,
          logging: true,
        };
      },
    }),
  ],
})
export class DatabaseModule {}
