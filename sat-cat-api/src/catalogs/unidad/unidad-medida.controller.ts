import { Controller, Get, Query } from '@nestjs/common';
import { UnidadMedidaService } from './unidad-medida.service';

@Controller('unidad-medida')
export class UnidadMedidaController {
  constructor(private readonly unidadMedidaService: UnidadMedidaService) {}

  @Get('buscar')
  async buscarUnidadMedida(@Query('termino') termino: string) {
    return this.unidadMedidaService.buscarUnidadMedida(termino);
  }

  @Get()
  async obtenerTodas() {
    return this.unidadMedidaService.obtenerTodas();
  }
}