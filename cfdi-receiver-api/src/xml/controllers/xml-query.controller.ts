import { Controller, Get, Query, UseGuards, Param } from '@nestjs/common';
import { XmlQueryService } from '../services/xml-query.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';

@Controller('xml-query')
@UseGuards(JwtAuthGuard)
export class XmlQueryController {
  constructor(private readonly xmlQueryService: XmlQueryService) {}

  @Get('rfc/:rfc')
  async buscarPorRfc(
    @Param('rfc') rfc: string,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @CurrentUser() user
  ) {
    return this.xmlQueryService.buscarPorRfc(
      rfc,
      user.uid,
      +page,
      +limit
    );
  }

  @Get('periodo')
  async buscarPorPeriodo(
    @Query('fechaInicio') fechaInicio: string,
    @Query('fechaFin') fechaFin: string,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @CurrentUser() user
  ) {
    return this.xmlQueryService.buscarPorPeriodo(
      new Date(fechaInicio),
      new Date(fechaFin),
      user.uid,
      +page,
      +limit
    );
  }

  @Get('resumen')
  async obtenerResumen(@CurrentUser() user) {
    return this.xmlQueryService.obtenerResumen(user.uid);
  }
}