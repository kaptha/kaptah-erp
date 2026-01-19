import { Module } from '@nestjs/common';
import { TimbradoService } from './timbrado.service';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  providers: [TimbradoService],
  exports: [TimbradoService],
})
export class TimbradoModule {}
