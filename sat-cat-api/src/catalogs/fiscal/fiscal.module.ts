import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FiscalController } from './fiscal.controller';
import { FiscalService } from './fiscal.service';
import {
  TipoPercepcion,
  TipoDeduccion,
  TipoOtroPago,
  TipoNomina,
  TipoContrato,
  TipoJornada,
  TipoRegimen,
  PeriodicidadPago,
  Banco,
  RiesgoPuesto,
  TipoIncapacidad,
  OrigenRecurso,
} from './entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TipoPercepcion,
      TipoDeduccion,
      TipoOtroPago,
      TipoNomina,
      TipoContrato,
      TipoJornada,
      TipoRegimen,
      PeriodicidadPago,
      Banco,
      RiesgoPuesto,
      TipoIncapacidad,
      OrigenRecurso,
    ]),
  ],
  controllers: [FiscalController],
  providers: [FiscalService],
  exports: [FiscalService],
})
export class FiscalModule {}
