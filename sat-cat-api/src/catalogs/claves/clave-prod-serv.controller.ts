import { Controller, Get, Query } from '@nestjs/common';
import { ClaveProdServService } from './clave-prod-serv.service';

@Controller('clave-prod-serv')
export class ClaveProdServController {
  constructor(private readonly claveProdServService: ClaveProdServService) {}

  @Get('buscar')
async buscarClaveProdServ(@Query('termino') termino: string) {
  return this.claveProdServService.buscarClaveProdServ(termino);
}

  @Get()
  async obtenerTodas() {
    return this.claveProdServService.obtenerTodas();
  }
}