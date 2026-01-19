import { Controller, Post, Body, UseGuards, Get, Req } from '@nestjs/common';
import { XmlImportService } from '../services/xml-import.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';

export class ImportarXmlsDto {
  rutaBase: string;
}

@Controller('xml-import')
@UseGuards(JwtAuthGuard)
export class XmlImportController {
  constructor(private readonly xmlImportService: XmlImportService) {}

  /**
   * Endpoint para importar toda la estructura de XMLs
   */
  @Post('estructura-completa')
  async importarEstructuraCompleta(
    @Body() dto: ImportarXmlsDto,
    @Req() req: any, // Aquí obtienes el usuario del JWT
  ) {
    // Por ahora usamos userId = 1, después implementas la extracción del JWT
    const usuarioId = req.user?.id || 1;
    
    const resultado = await this.xmlImportService.importarEstructuraCompleta(
      dto.rutaBase,
      usuarioId,
    );

    return {
      success: true,
      mensaje: 'Importación completada',
      resultado,
    };
  }

  /**
   * Endpoint para obtener estadísticas de importación
   */
  @Get('estadisticas')
  async obtenerEstadisticas(@Req() req: any) {
    const usuarioId = req.user?.id || 1;
    
    const estadisticas = await this.xmlImportService.obtenerEstadisticasImportacion(usuarioId);
    
    return {
      success: true,
      estadisticas,
    };
  }
  @Post('reprocesar-rfcs')
  async reprocesarRfcs() {
    return this.xmlImportService.reprocesarRfcsExistentes();
  }
}