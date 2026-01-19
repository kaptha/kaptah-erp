import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres', // Asumiendo que usas PostgreSQL
      host: 'localhost', // O la dirección de tu servidor de base de datos
      port: 5432, // Puerto por defecto de PostgreSQL
      username: 'postgres',
      password: 'sx1180',
      database: 'catalogos',
      entities: [__dirname + '/../**/*.entity{.ts,.js}'],
      synchronize: false, // Solo para desarrollo, no uses en producción
      autoLoadEntities: true,
      logging: true, // Añade esto para ver los logs de TypeORM
      logger: 'advanced-console', // Y esto para un logging más detallado
    }),
  ],
})
export class DatabaseModule {}