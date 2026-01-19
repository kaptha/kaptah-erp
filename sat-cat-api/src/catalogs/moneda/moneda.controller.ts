import { Controller, Get, Query } from '@nestjs/common';
import { MonedaService } from './moneda.service';

@Controller('moneda')
export class MonedaController {
  constructor(private readonly monedaService: MonedaService) {}

  @Get('buscar')
  async buscarMoneda(@Query('termino') termino: string) {
    return this.monedaService.buscarMoneda(termino);
  }

  @Get()
  async obtenerTodas() {
    return this.monedaService.obtenerTodas();
  }
}