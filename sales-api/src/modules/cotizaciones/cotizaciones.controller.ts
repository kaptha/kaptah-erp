import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Param, 
  Put, 
  Delete,
  Query,
  HttpStatus,
  HttpCode,
  ParseIntPipe,
  Logger,
  UseGuards,
  Res,
  Req
} from '@nestjs/common';
import type { Response, Request } from 'express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Public } from '../../auth/decorators/public.decorator';
import { CotizacionesService } from './cotizaciones.service';
import { CreateCotizacionDto } from './dto/create-cotizacion.dto';
import { UpdateCotizacionDto } from './dto/update-cotizacion.dto';

@ApiTags('Cotizaciones')
@ApiBearerAuth()
@Controller('cotizaciones')
@UseGuards(JwtAuthGuard)
export class CotizacionesController {
  private readonly logger = new Logger(CotizacionesController.name);

  constructor(private readonly cotizacionesService: CotizacionesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear nueva cotización' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Cotización creada exitosamente con folio generado' })
  async create(
    @Body() createCotizacionDto: CreateCotizacionDto,
    @CurrentUser() user?: any
  ) {
    this.logger.log(`📬 POST /cotizaciones - Crear nueva cotización`);
    
    this.logger.debug(`DTO recibido: ${JSON.stringify(createCotizacionDto)}`);
    this.logger.debug(`usuario_id en DTO: ${createCotizacionDto.usuario_id}`);
    
    this.logger.log(`Usuario ID: ${createCotizacionDto.usuario_id} | Cliente: ${createCotizacionDto.cliente_id} | Sucursal: ${createCotizacionDto.sucursal_id || 'Sin sucursal'}`);
    
    const cotizacion = await this.cotizacionesService.create(createCotizacionDto);
    
    return {
      success: true,
      message: 'Cotización creada exitosamente',
      data: cotizacion,
    };
  }

  @Public()
  @Get(':id/pdf/:style')
  @ApiOperation({ summary: 'Generar PDF de cotización' })
  async generarPdfDeCotizacion(
    @Param('id', ParseIntPipe) id: number,
    @Param('style') estilo: string,
    @Res() res: Response,
    @Req() req: Request,
    @CurrentUser() user?: any
  ) {
    this.logger.log(`📬 GET /cotizaciones/${id}/pdf/${estilo}`);
    
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader : null;
    
    console.log('🔐 Token recibido:', token ? 'Sí' : 'No');
    
    const pdf = await this.cotizacionesService.generarPdfEstiloCotizacion(id, estilo, token);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=cotizacion_${id}.pdf`,
      'Content-Length': pdf.length,
    });

    res.end(pdf);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todas las cotizaciones' })
  @ApiQuery({ name: 'sucursal_id', required: false, description: 'Filtrar por ID de sucursal' })
  async findAll(
    @CurrentUser() user: any,
    @Query('sucursal_id') sucursal_id?: string
  ) {
    this.logger.log(`📬 GET /cotizaciones${sucursal_id ? `?sucursal_id=${sucursal_id}` : ''} - Usuario: ${user.uid}`);
    
    if (sucursal_id) {
      const id = parseInt(sucursal_id, 10);
      
      if (id === 0) {
        const cotizaciones = await this.cotizacionesService.findWithoutSucursal();
        return {
          success: true,
          data: cotizaciones,
          message: `${cotizaciones.length} cotizaciones sin sucursal`,
        };
      }
      
      const cotizaciones = await this.cotizacionesService.findBySucursal(id);
      return {
        success: true,
        data: cotizaciones,
        message: `${cotizaciones.length} cotizaciones de la sucursal ${id}`,
      };
    }
    
    const cotizaciones = await this.cotizacionesService.findAll();
    return {
      success: true,
      data: cotizaciones,
      message: `${cotizaciones.length} cotizaciones encontradas`,
    };
  }

  // ✨ NUEVO: Buscar por folio
  @Get('folio/:folio')
  @ApiOperation({ summary: 'Buscar cotización por folio' })
  @ApiParam({ name: 'folio', description: 'Folio de la cotización (ej: COT-2025-0001)', example: 'COT-2025-0001' })
  @ApiResponse({ status: 200, description: 'Cotización encontrada' })
  @ApiResponse({ status: 404, description: 'Cotización no encontrada' })
  async findByFolio(
    @Param('folio') folio: string,
    @CurrentUser() user: any
  ) {
    this.logger.log(`📬 GET /cotizaciones/folio/${folio} - Usuario: ${user.uid}`);
    
    const cotizacion = await this.cotizacionesService.findByFolio(folio);
    
    return {
      success: true,
      data: cotizacion,
    };
  }

  // ✨ NUEVO: Obtener estadísticas de folios
  @Get('stats/folios')
  @ApiOperation({ summary: 'Obtener estadísticas de folios por año' })
  @ApiQuery({ name: 'year', required: false, description: 'Año para consultar (por defecto: año actual)' })
  @ApiResponse({ status: 200, description: 'Estadísticas obtenidas' })
  getFolioStats(@Query('year') year?: number) {
    return this.cotizacionesService.getFolioStats(year);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una cotización por ID' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user?: any
  ) {
    this.logger.log(`📬 GET /cotizaciones/${id} - Usuario: ${user.uid}`);
    
    const cotizacion = await this.cotizacionesService.findOne(id);
    
    return {
      success: true,
      data: cotizacion,
    };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar una cotización' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCotizacionDto: UpdateCotizacionDto,
    @CurrentUser() user?: any
  ) {
    this.logger.log(`📬 PUT /cotizaciones/${id} - Usuario: ${user.uid}`);
    this.logger.log(`Sucursal: ${updateCotizacionDto.sucursal_id || 'Sin cambios'}`);
    
    const cotizacion = await this.cotizacionesService.update(id, updateCotizacionDto);
    
    return {
      success: true,
      message: 'Cotización actualizada exitosamente',
      data: cotizacion,
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar una cotización' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user?: any
  ) {
    this.logger.log(`📬 DELETE /cotizaciones/${id} - Usuario: ${user.uid}`);
    
    await this.cotizacionesService.remove(id);
    
    return {
      success: true,
      message: 'Cotización eliminada exitosamente',
    };
  }

  @Get('sucursal/:sucursalId')
  @ApiOperation({ summary: 'Obtener cotizaciones por sucursal' })
  async findBySucursal(
    @Param('sucursalId', ParseIntPipe) sucursal_id: number,
    @CurrentUser() user?: any
  ) {
    this.logger.log(`📬 GET /cotizaciones/sucursal/${sucursal_id} - Usuario: ${user.uid}`);
    
    const cotizaciones = await this.cotizacionesService.findBySucursal(sucursal_id);
    
    return {
      success: true,
      data: cotizaciones,
      message: `${cotizaciones.length} cotizaciones de la sucursal ${sucursal_id}`,
    };
  }

  @Get('sin-sucursal/list')
  @ApiOperation({ summary: 'Obtener cotizaciones sin sucursal' })
  async findWithoutSucursal(@CurrentUser() user?: any) {
    this.logger.log(`📬 GET /cotizaciones/sin-sucursal/list - Usuario: ${user.uid}`);
    
    const cotizaciones = await this.cotizacionesService.findWithoutSucursal();
    
    return {
      success: true,
      data: cotizaciones,
      message: `${cotizaciones.length} cotizaciones sin sucursal`,
    };
  }

  @Post(':id/send-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Enviar cotización por email' })
  async sendByEmail(
    @Param('id', ParseIntPipe) id: number,
    @Body() emailData: {
      recipientEmail: string;
      customMessage?: string;
      pdfStyle?: string;
    },
    @CurrentUser() user: any,
  ) {
    this.logger.log(`📬 POST /cotizaciones/${id}/send-email - Usuario: ${user.uid}`);
    
    return this.cotizacionesService.sendQuotationByEmail(
      id,
      emailData.recipientEmail,
      emailData.customMessage,
      user.uid,
      emailData.pdfStyle || 'classic',
    );
  }
  /**
   * NUEVO: Convertir cotización a orden de venta
   */
  @Post(':id/convert-to-order')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Convertir cotización a orden de venta' })
  @ApiParam({ name: 'id', description: 'ID de la cotización' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Cotización convertida exitosamente' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Cotización no encontrada' })
  async convertToSalesOrder(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any
  ) {
    this.logger.log(`📬 POST /cotizaciones/${id}/convert-to-order - Usuario: ${user.uid}`);
    
    return await this.cotizacionesService.convertToSalesOrder(id, user.uid);
  }

  /**
   * NUEVO: Reenviar email de cotización
   */
  @Post(':id/reenviar-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reenviar email de la cotización' })
  @ApiParam({ name: 'id', description: 'ID de la cotización' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Email reenviado exitosamente' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Cotización no encontrada' })
  async reenviarEmail(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any
  ) {
    this.logger.log(`📬 POST /cotizaciones/${id}/reenviar-email - Usuario: ${user.uid}`);
    
    return await this.cotizacionesService.reenviarEmail(id, user.uid);
  }

  /**
   * NUEVO: Regenerar PDF de cotización
   */
  @Post(':id/regenerar-pdf')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Regenerar PDF de la cotización' })
  @ApiParam({ name: 'id', description: 'ID de la cotización' })
  @ApiResponse({ status: HttpStatus.OK, description: 'PDF regenerándose' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Cotización no encontrada' })
  async regenerarPDF(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any
  ) {
    this.logger.log(`📬 POST /cotizaciones/${id}/regenerar-pdf - Usuario: ${user.uid}`);
    
    return await this.cotizacionesService.regenerarPDF(id, user.uid);
  }

  /**
   * NUEVO: Aprobar cotización
   */
  @Put(':id/aprobar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Aprobar cotización' })
  @ApiParam({ name: 'id', description: 'ID de la cotización' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Cotización aprobada' })
  async aprobar(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any
  ) {
    this.logger.log(`📬 PUT /cotizaciones/${id}/aprobar - Usuario: ${user.uid}`);
    
    return await this.cotizacionesService.update(id, { estado: 'aprobada' } as any);
  }

  /**
   * NUEVO: Rechazar cotización
   */
  @Put(':id/rechazar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rechazar cotización' })
  @ApiParam({ name: 'id', description: 'ID de la cotización' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Cotización rechazada' })
  async rechazar(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { motivo?: string },
    @CurrentUser() user: any
  ) {
    this.logger.log(`📬 PUT /cotizaciones/${id}/rechazar - Usuario: ${user.uid}`);
    
    return await this.cotizacionesService.update(id, { 
      estado: 'rechazada',
      observaciones: body.motivo 
    } as any);
  }
}
