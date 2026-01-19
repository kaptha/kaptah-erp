import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PostalController } from './postal.controller';
import { PostalService } from './postal.service';
import { Postal } from './postal/entities/postal.entity';
import { Colonia } from './postal/entities/colonia.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Postal, Colonia])],
  controllers: [PostalController],
  providers: [PostalService],
  exports: [PostalService, TypeOrmModule] 
})
export class PostalModule {}
