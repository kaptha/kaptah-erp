import { Controller, Get, Post, Body, Put, Param, Delete, UseGuards, Res, Req, HttpStatus, Headers, Query } from '@nestjs/common';
import type { Response, Request } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { SaleNotesService } from './sale-notes.service';
import { CreateSaleNoteDto } from './dto/create-sale-note.dto';
import { UpdateSaleNoteDto } from './dto/update-sale-note.dto';
import { SendInvoiceEmailDto } from '../email-client/dto/send-invoice-email.dto';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Public } from '../../auth/decorators/public.decorator';

@ApiTags('SaleNotes')
@ApiBearerAuth()
@Controller('sale-notes')
@UseGuards(JwtAuthGuard)
export class SaleNotesController {
  constructor(private readonly saleNotesService: SaleNotesService) {}

  // NUEVO ENDPOINT: Generar PDF
  @Public()
  @Get(':id/pdf/:style')
  async generarPdfDeNota(
    @Param('id') id: string,
    @Param('style') estilo: string,
    @CurrentUser('uid') userId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    console.log('🔥 Request para generar PDF de nota de venta');
    
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader : null;
    
    console.log('🔐 Token recibido:', token ? 'Sí' : 'No');
    
    const pdf = await this.saleNotesService.generarPdfEstiloRemision(
      id, 
      null,
      estilo,
      token
    );

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=nota_venta_${id}.pdf`,
      'Content-Length': pdf.length,
    });

    res.end(pdf);
  }

  @Post()
  @ApiOperation({ summary: 'Crear una nota de venta' })
  @ApiResponse({ status: 201, description: 'Nota creada exitosamente con folio generado' })
  create(@Body() createSaleNoteDto: CreateSaleNoteDto, @CurrentUser() user: any) {
    return this.saleNotesService.create(createSaleNoteDto, user.uid);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todas las notas de venta' })
  findAll(@CurrentUser() user: any) {
    return this.saleNotesService.findAll(user.uid);
  }

  // ✨ NUEVO: Buscar por folio
  @Get('folio/:folio')
  @ApiOperation({ summary: 'Buscar nota de venta por folio' })
  @ApiParam({ name: 'folio', description: 'Folio de la nota (ej: NV-2025-0001)', example: 'NV-2025-0001' })
  @ApiResponse({ status: 200, description: 'Nota encontrada' })
  @ApiResponse({ status: 404, description: 'Nota no encontrada' })
  findByFolio(@Param('folio') folio: string, @CurrentUser() user: any) {
    return this.saleNotesService.findByFolio(folio, user.uid);
  }

  // ✨ NUEVO: Obtener estadísticas de folios
  @Get('stats/folios')
  @ApiOperation({ summary: 'Obtener estadísticas de folios por año' })
  @ApiQuery({ name: 'year', required: false, description: 'Año para consultar (por defecto: año actual)' })
  @ApiResponse({ status: 200, description: 'Estadísticas obtenidas' })
  getFolioStats(@Query('year') year?: number) {
    return this.saleNotesService.getFolioStats(year);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una nota de venta por ID' })
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.saleNotesService.findOne(id, user.uid);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar una nota de venta' })
  update(
    @Param('id') id: string,
    @Body() updateSaleNoteDto: UpdateSaleNoteDto,
    @CurrentUser() user: any
  ) {
    return this.saleNotesService.update(id, updateSaleNoteDto, user.uid);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar una nota de venta' })
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.saleNotesService.remove(id, user.uid);
  }

  @Post(':id/send-email')
  @ApiOperation({ summary: 'Enviar nota de venta por email' })
  @ApiParam({ name: 'id', description: 'ID de la nota de venta' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Email enviado exitosamente' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Nota no encontrada' })
  async sendByEmail(
    @Param('id') id: string,
    @Body() emailData: SendInvoiceEmailDto,
    @CurrentUser() user: any,
    @Headers('x-firebase-token') firebaseToken: string,
  ) {
    console.log('🔐 Firebase idToken recibido:', firebaseToken ? 'Sí ✅' : 'NO ❌');
    console.log('🔐 Token (primeros 50):', firebaseToken?.substring(0, 50));

    return this.saleNotesService.sendSaleNoteByEmail(
      id,
      emailData.recipientEmail,
      emailData.customMessage,
      user.uid,
      firebaseToken,
      emailData.pdfStyle || 'classic',
    );
  }
}