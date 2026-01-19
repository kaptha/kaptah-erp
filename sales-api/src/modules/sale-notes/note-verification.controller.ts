import { Controller, Get, Param, Query, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { NoteVerificationService } from './note-verification.service';

@ApiTags('Verificación de Notas')
@Controller('verificar')
export class NoteVerificationController {
  constructor(
    private readonly verificationService: NoteVerificationService,
  ) {}

  /**
   * Endpoint principal de verificación por hash (para QR)
   * GET /verificar/nota/:hash
   */
  @Get('nota/:hash')
  @ApiOperation({ summary: 'Verificar nota de venta mediante código QR' })
  @ApiParam({ name: 'hash', description: 'Hash de verificación del QR' })
  @ApiResponse({ status: 200, description: 'Nota verificada exitosamente' })
  @ApiResponse({ status: 400, description: 'Hash inválido' })
  @ApiResponse({ status: 404, description: 'Nota no encontrada' })
  async verifyByHash(@Param('hash') hash: string) {
    if (!hash || hash.trim() === '') {
      throw new BadRequestException('Hash de verificación requerido');
    }

    const result = await this.verificationService.verifyNoteByHash(hash);

    return {
      success: true,
      message: 'Documento verificado exitosamente',
      data: result,
      verificadoEn: new Date().toISOString(),
    };
  }

  /**
   * Endpoint alternativo de verificación por folio
   * GET /verificar/nota?folio=NV-0026-00001
   */
  @Get('nota')
  @ApiOperation({ summary: 'Verificar nota de venta por folio' })
  @ApiResponse({ status: 200, description: 'Nota verificada' })
  @ApiResponse({ status: 404, description: 'Nota no encontrada' })
  async verifyByFolio(@Query('folio') folio: string) {
    if (!folio) {
      throw new BadRequestException('Folio requerido');
    }

    const result = await this.verificationService.verifyNoteByFolio(folio);

    return {
      success: true,
      message: 'Nota encontrada',
      data: result,
    };
  }
}