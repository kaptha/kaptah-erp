import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CatalogsModule } from './catalogs/catalogs.module';
import { DatabaseModule } from './database/database.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    CatalogsModule,
  ],
})
export class AppModule {}
