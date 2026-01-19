import { Module } from '@nestjs/common';
import { SucursalesService } from './sucursales.service';

@Module({
  providers: [SucursalesService],
  exports: [SucursalesService],
})
export class SucursalesModule {}