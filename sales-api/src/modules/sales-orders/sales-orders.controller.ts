import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, HttpStatus, Res, Req, Query } from '@nestjs/common';
import type { Response, Request } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { SalesOrdersService } from './sales-orders.service';
import { CreateSalesOrderDto } from './dto/create-sales-order.dto';
import { UpdateSalesOrderDto } from './dto/update-sales-order.dto';
import { SendInvoiceEmailDto } from '../email-client/dto/send-invoice-email.dto';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { SalesOrder } from './entities/sales-order.entity';
import { Public } from '../../auth/decorators/public.decorator';

@ApiTags('SalesOrders')
@ApiBearerAuth()
@Controller('sales-orders')
@UseGuards(JwtAuthGuard)
export class SalesOrdersController {
  constructor(private readonly salesOrdersService: SalesOrdersService) {}

  @Public()
  @Get(':id/pdf/:style')
  async generarPdfDeOrden(
    @Param('id') id: string,
    @Param('style') estilo: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    console.log('🔥 Request para generar PDF');
    
    console.log('📋 Todos los headers:', JSON.stringify(req.headers));
    
    const authHeader = req.headers.authorization;
    console.log('🔐 Authorization header RAW:', authHeader);
    
    const token = authHeader?.startsWith('Bearer ') ? authHeader : null;
    console.log('🔐 Token procesado:', token?.substring(0, 60));
    
    const pdf = await this.salesOrdersService.generarPdfEstiloRemision(
      id, 
      null,
      estilo, 
      token
    );

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=orden_${id}.pdf`,
      'Content-Length': pdf.length,
    });

    res.end(pdf);
  }

  @Post()
  @ApiOperation({ summary: 'Crear una orden de venta' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Orden creada exitosamente con folio generado', type: SalesOrder })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Datos inválidos' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'No autorizado' })
  create(@Body() createSalesOrderDto: CreateSalesOrderDto, @CurrentUser() user: any) {
    return this.salesOrdersService.create(createSalesOrderDto, user.uid);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todas las órdenes de venta' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Lista de órdenes de venta', type: [SalesOrder] })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'No autorizado' })
  findAll(@CurrentUser() user: any) {
    return this.salesOrdersService.findAll(user.uid);
  }

  // ✨ NUEVO: Buscar por folio
  @Get('folio/:folio')
  @ApiOperation({ summary: 'Buscar orden de venta por folio' })
  @ApiParam({ name: 'folio', description: 'Folio de la orden (ej: OV-2025-0001)', example: 'OV-2025-0001' })
  @ApiResponse({ status: 200, description: 'Orden encontrada' })
  @ApiResponse({ status: 404, description: 'Orden no encontrada' })
  findByFolio(@Param('folio') folio: string, @CurrentUser() user: any) {
    return this.salesOrdersService.findByFolio(folio, user.uid);
  }

  // ✨ NUEVO: Obtener estadísticas de folios
  @Get('stats/folios')
  @ApiOperation({ summary: 'Obtener estadísticas de folios por año' })
  @ApiQuery({ name: 'year', required: false, description: 'Año para consultar (por defecto: año actual)' })
  @ApiResponse({ status: 200, description: 'Estadísticas obtenidas' })
  getFolioStats(@Query('year') year?: number) {
    return this.salesOrdersService.getFolioStats(year);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una orden de venta por ID' })
  @ApiParam({ name: 'id', description: 'ID de la orden de venta' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Orden de venta encontrada', type: SalesOrder })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Orden no encontrada' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'No autorizado' })
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.salesOrdersService.findOne(id, user.uid);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar una orden de venta' })
  @ApiParam({ name: 'id', description: 'ID de la orden de venta' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Orden actualizada exitosamente', type: SalesOrder })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Datos inválidos' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Orden no encontrada' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'No autorizado' })
  update(
    @Param('id') id: string,
    @Body() updateSalesOrderDto: UpdateSalesOrderDto,
    @CurrentUser() user: any
  ) {
    return this.salesOrdersService.update(id, updateSalesOrderDto, user.uid);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar una orden de venta' })
  @ApiParam({ name: 'id', description: 'ID de la orden de venta' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Orden eliminada exitosamente' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Orden no encontrada' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'No autorizado' })
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.salesOrdersService.remove(id, user.uid);
  }

  @Put(':id/status')
  @ApiOperation({ summary: 'Actualizar el estado de una orden de venta' })
  @ApiParam({ name: 'id', description: 'ID de la orden de venta' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Estado actualizado exitosamente', type: SalesOrder })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Estado inválido' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Orden no encontrada' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'No autorizado' })
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: string,
    @CurrentUser() user: any
  ) {
    return this.salesOrdersService.updateStatus(id, status, user.uid);
  }

  @Post(':id/send-email')
  @ApiOperation({ summary: 'Enviar orden de venta por email al cliente' })
  @ApiParam({ name: 'id', description: 'ID de la orden de venta' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Email enviado exitosamente' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Orden no encontrada' })
  async sendByEmail(
    @Param('id') id: string,
    @Body() emailData: SendInvoiceEmailDto,
    @CurrentUser() user: any,
  ) {
    return this.salesOrdersService.sendSaleOrderByEmail(
      id,
      emailData.recipientEmail,
      emailData.customMessage,
      user.uid,
    );
  }
  /**
   * NUEVO: Convertir orden a nota de venta
   */
  @Post(':id/convert-to-sale-note')
  @ApiOperation({ summary: 'Convertir orden de venta a nota de venta' })
  @ApiParam({ name: 'id', description: 'ID de la orden de venta' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Orden convertida exitosamente' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Orden no encontrada' })
  async convertToSaleNote(
    @Param('id') id: string,
    @CurrentUser() user: any
  ) {
    return await this.salesOrdersService.convertToSaleNote(id, user.uid);
  }

  /**
   * NUEVO: Reenviar email de orden
   */
  @Post(':id/reenviar-email')
  @ApiOperation({ summary: 'Reenviar email de la orden de venta' })
  @ApiParam({ name: 'id', description: 'ID de la orden de venta' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Email reenviado exitosamente' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Orden no encontrada' })
  async reenviarEmail(
    @Param('id') id: string,
    @CurrentUser() user: any
  ) {
    return await this.salesOrdersService.reenviarEmail(id, user.uid);
  }

  /**
   * NUEVO: Regenerar PDF de orden
   */
  @Post(':id/regenerar-pdf')
  @ApiOperation({ summary: 'Regenerar PDF de la orden de venta' })
  @ApiParam({ name: 'id', description: 'ID de la orden de venta' })
  @ApiResponse({ status: HttpStatus.OK, description: 'PDF regenerándose' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Orden no encontrada' })
  async regenerarPDF(
    @Param('id') id: string,
    @CurrentUser() user: any
  ) {
    return await this.salesOrdersService.regenerarPDF(id, user.uid);
  }
}