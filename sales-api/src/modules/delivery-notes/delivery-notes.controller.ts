import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { RequirePermission } from '../../auth/decorators/require-permission.decorator';
import { Controller, Get, Post, Body, Put, Param, Delete, UseGuards, HttpStatus, Query, Res, Req } from '@nestjs/common';
import type { Response, Request } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { DeliveryNotesService } from './delivery-notes.service';
import { CreateDeliveryNoteDto } from './dto/create-delivery-note.dto';
import { UpdateDeliveryNoteDto } from './dto/update-delivery-note.dto';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { DeliveryNote } from './entities/delivery-note.entity';
import { SendInvoiceEmailDto } from '../email-client/dto/send-invoice-email.dto';
import { Public } from '../../auth/decorators/public.decorator';

@ApiTags('DeliveryNotes')
@ApiBearerAuth()
@Controller('delivery-notes')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DeliveryNotesController {
  constructor(private readonly deliveryNotesService: DeliveryNotesService) {}

  // ✨ NUEVO ENDPOINT: Generar PDF de Guía de Remisión
  @Public()
  @Get(':id/pdf')
  @ApiOperation({ summary: 'Generar PDF de guía de remisión' })
  @ApiParam({ name: 'id', description: 'ID de la guía de remisión' })
  @ApiResponse({ status: HttpStatus.OK, description: 'PDF generado exitosamente' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Guía no encontrada' })
  async generarPdfDeGuia(
    @Param('id') id: string,
    @CurrentUser('uid') userId: string,
    @Query('cuentaUid') cuentaUid: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    console.log('📦 Request para generar PDF de guia de remision');
    console.log('📋 Delivery Note ID:', id);
    console.log('👤 User ID:', userId);
    console.log('🏢 Cuenta UID:', cuentaUid);
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader : null;
    console.log('🔐 Token recibido:', token ? 'Si' : 'No');
    const pdf = await this.deliveryNotesService.generarPdfEstiloRemision(
      id,
      userId,
      'profesional',
      token,
      cuentaUid
    );

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename=guia_remision_${id}.pdf`,
      'Content-Length': pdf.length,
    });

    res.end(pdf);
  }

  @Post()
  @ApiOperation({ summary: 'Crear una nota de remisión' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Nota creada exitosamente con folio generado', type: DeliveryNote })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Datos inválidos' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'No autorizado' })
  @RequirePermission('guias_remision.crear')
  create(
    @Body() createDeliveryNoteDto: CreateDeliveryNoteDto,
    @CurrentUser() user: any,
    @Query('cuentaUid') cuentaUid?: string
  ) {
    return this.deliveryNotesService.create(createDeliveryNoteDto, cuentaUid || user.uid);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todas las notas de remisión' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Lista de notas de remisión', type: [DeliveryNote] })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'No autorizado' })
  findAll(@CurrentUser() user: any, @Query('cuentaUid') cuentaUid?: string) {
    return this.deliveryNotesService.findAll(cuentaUid || user.uid);
  }

  // ✨ NUEVO: Buscar por folio
  @Get('folio/:folio')
  @ApiOperation({ summary: 'Buscar nota de remisión por folio' })
  @ApiParam({ name: 'folio', description: 'Folio de la nota (ej: REM-2025-0001)', example: 'REM-2025-0001' })
  @ApiResponse({ status: 200, description: 'Nota encontrada' })
  @ApiResponse({ status: 404, description: 'Nota no encontrada' })
  findByFolio(@Param('folio') folio: string, @CurrentUser() user: any) {
    return this.deliveryNotesService.findByFolio(folio, user.uid);
  }

  // ✨ NUEVO: Obtener estadísticas de folios
  @Get('stats/folios')
  @ApiOperation({ summary: 'Obtener estadísticas de folios por año' })
  @ApiQuery({ name: 'year', required: false, description: 'Año para consultar (por defecto: año actual)' })
  @ApiResponse({ status: 200, description: 'Estadísticas obtenidas' })
  getFolioStats(@Query('year') year?: number) {
    return this.deliveryNotesService.getFolioStats(year);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una nota de remisión por ID' })
  @ApiParam({ name: 'id', description: 'ID de la nota de remisión' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Nota de remisión encontrada', type: DeliveryNote })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Nota no encontrada' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'No autorizado' })
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deliveryNotesService.findOne(id, user.uid);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar una nota de remisión' })
  @ApiParam({ name: 'id', description: 'ID de la nota de remisión' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Nota actualizada exitosamente', type: DeliveryNote })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Datos inválidos' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Nota no encontrada' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'No autorizado' })
  @RequirePermission('guias_remision.editar')
  update(
    @Param('id') id: string,
    @Body() updateDeliveryNoteDto: UpdateDeliveryNoteDto,
    @CurrentUser() user: any
  ) {
    return this.deliveryNotesService.update(id, updateDeliveryNoteDto, user.uid);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar una nota de remisión' })
  @ApiParam({ name: 'id', description: 'ID de la nota de remisión' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Nota eliminada exitosamente' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Nota no encontrada' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'No se puede eliminar una nota entregada' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'No autorizado' })
  @RequirePermission('guias_remision.eliminar')
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deliveryNotesService.remove(id, user.uid);
  }

  @Post(':id/send-email')
  @ApiOperation({ summary: 'Enviar nota de entrega por email' })
  @ApiParam({ name: 'id', description: 'ID de la nota de entrega' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Email enviado exitosamente' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Nota no encontrada' })
  async sendByEmail(
    @Param('id') id: string,
    @Body() emailData: SendInvoiceEmailDto,
    @CurrentUser() user: any,
    @Query('cuentaUid') cuentaUid?: string,
  ) {
    const ownerUid = cuentaUid || user.uid;
    return this.deliveryNotesService.sendDeliveryNoteByEmail(
      id,
      emailData.recipientEmail,
      emailData.customMessage,
      ownerUid,
    );
  }
  /**
   * NUEVO: Marcar como entregada
   */
  @Put(':id/entregar')
  @ApiOperation({ summary: 'Marcar nota de entrega como entregada' })
  @ApiParam({ name: 'id', description: 'ID de la nota de entrega' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Nota marcada como entregada' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Nota no encontrada' })
  async marcarComoEntregada(
    @Param('id') id: string,
    @Body() body: {
      receptorNombre?: string;
      firmaReceptor?: string; // Base64 de la firma
    },
    @CurrentUser() user: any
  ) {
    return await this.deliveryNotesService.marcarComoEntregada(
      id,
      user.uid,
      body.receptorNombre,
      body.firmaReceptor
    );
  }

  /**
   * NUEVO: Reenviar email
   */
  @Post(':id/reenviar-email')
  @ApiOperation({ summary: 'Reenviar email de la nota de entrega' })
  @ApiParam({ name: 'id', description: 'ID de la nota de entrega' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Email reenviado exitosamente' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Nota no encontrada' })
  async reenviarEmail(
    @Param('id') id: string,
    @CurrentUser() user: any
  ) {
    return await this.deliveryNotesService.reenviarEmail(id, user.uid);
  }

  /**
   * NUEVO: Regenerar PDF
   */
  @Post(':id/regenerar-pdf')
  @ApiOperation({ summary: 'Regenerar PDF de la nota de entrega' })
  @ApiParam({ name: 'id', description: 'ID de la nota de entrega' })
  @ApiResponse({ status: HttpStatus.OK, description: 'PDF regenerándose' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Nota no encontrada' })
  async regenerarPDF(
    @Param('id') id: string,
    @CurrentUser() user: any
  ) {
    return await this.deliveryNotesService.regenerarPDF(id, user.uid);
  }

  /**
   * NUEVO: Marcar como en tránsito
   */
  @Put(':id/en-transito')
  @ApiOperation({ summary: 'Marcar nota como en tránsito' })
  @ApiParam({ name: 'id', description: 'ID de la nota de entrega' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Nota marcada como en tránsito' })
  async marcarEnTransito(
    @Param('id') id: string,
    @CurrentUser() user: any
  ) {
    return await this.deliveryNotesService.update(
      id,
      { status: 'TRANSIT' } as any,
      user.uid
    );
  }
}
