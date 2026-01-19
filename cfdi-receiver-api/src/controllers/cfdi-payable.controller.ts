import { Controller, Get, Param, Query, Post, Body, UseGuards, ParseIntPipe, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger';
import { CfdiPayableService } from '../services/cfdi-payable.service';

@ApiTags('cfdi-payable')
@ApiBearerAuth()
@Controller('cfdis')
export class CfdiPayableController {
  constructor(private readonly cfdiPayableService: CfdiPayableService) {}

 @Get('user/:userId')
async getCfdisByUserId(@Param('userId') userId: string) {
  console.log('getCfdisByUserId con userId:', userId);
  // ✅ Pasar directamente como string, sin conversión
  return this.cfdiPayableService.findByUserId(userId);
}

@Get('user/:userId/provider/:providerRfc')
@ApiOperation({ summary: 'Obtener CFDIs de un usuario filtrados por RFC del proveedor' })
async getCfdisByProviderRfc(
  @Param('userId') userId: string,
  @Param('providerRfc') providerRfc: string
) {
  console.log('🔍 getCfdisByProviderRfc - userId:', userId, 'providerRfc:', providerRfc);
  return this.cfdiPayableService.findByUserIdAndProviderRfc(userId, providerRfc);
}
@Get('user/:userId/available-payable')
@ApiOperation({ summary: 'Obtener CFDIs disponibles para crear cuentas por pagar' })
async getAvailableForPayable(@Param('userId') userId: string) {
  console.log('🔍 getAvailableForPayable llamado con userId:', userId);
  
  return this.cfdiPayableService.findAvailableForPayable(userId);
}

  @Get('user/:userId/search')
  @ApiOperation({ summary: 'Buscar CFDIs con criterios múltiples' })
  @ApiParam({ name: 'userId', description: 'ID numérico del usuario' })
  @ApiQuery({ name: 'rfcEmisor', required: false })
  @ApiQuery({ name: 'fechaInicio', required: false })
  @ApiQuery({ name: 'fechaFin', required: false })
  @ApiQuery({ name: 'estado', required: false })
  @ApiQuery({ name: 'montoMinimo', required: false })
  @ApiQuery({ name: 'montoMaximo', required: false })
  async searchCfdis(
    @Param('userId') userId: string,
    @Query('rfcEmisor') rfcEmisor?: string,
    @Query('fechaInicio') fechaInicio?: string,
    @Query('fechaFin') fechaFin?: string,
    @Query('estado') estado?: string,
    @Query('montoMinimo') montoMinimo?: number,
    @Query('montoMaximo') montoMaximo?: number
  ) {
    return this.cfdiPayableService.searchCfdis(userId, {
      rfcEmisor,
      fechaInicio,
      fechaFin,
      estado,
      montoMinimo,
      montoMaximo
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un CFDI específico por ID' })
  @ApiParam({ name: 'id', description: 'ID del CFDI' })
  async getCfdiById(@Param('id', ParseIntPipe) id: number) {
    return this.cfdiPayableService.findById(id);
  }

  @Post(':id/mark-used')
  @ApiOperation({ summary: 'Marcar un CFDI como usado en una cuenta por pagar' })
  @ApiParam({ name: 'id', description: 'ID del CFDI' })
  async markCfdiAsUsed(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { accountPayableId: string }
  ) {
    return this.cfdiPayableService.markAsUsed(id, body.accountPayableId);
  }
}