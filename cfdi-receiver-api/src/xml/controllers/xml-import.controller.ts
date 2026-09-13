import { Controller, Post, Body, UseGuards, Get, Req, Query } from '@nestjs/common';
import { XmlImportService } from '../services/xml-import.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';

export class ImportarXmlsDto {
  rutaBase: string;
}

@Controller('xml-import')
@UseGuards(JwtAuthGuard)
export class XmlImportController {
  constructor(private readonly xmlImportService: XmlImportService) {}

  /** El JWT de Kaptah trae { uid, email, rfc }; ?cuentaUid= permite operar otra cuenta */
  private cuentaDe(req: any, cuentaUid?: string): string {
    return cuentaUid || req.user?.uid;
  }

  /**
   * Endpoint para importar toda la estructura de XMLs
   */
  @Post('estructura-completa')
  async importarEstructuraCompleta(
    @Body() dto: ImportarXmlsDto,
    @Req() req: any,
    @Query('cuentaUid') cuentaUid?: string,
  ) {
    const resultado = await this.xmlImportService.importarEstructuraCompleta(
      dto.rutaBase,
      this.cuentaDe(req, cuentaUid),
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
  async obtenerEstadisticas(@Req() req: any, @Query('cuentaUid') cuentaUid?: string) {
    const estadisticas = await this.xmlImportService.obtenerEstadisticasImportacion(this.cuentaDe(req, cuentaUid));

    return {
      success: true,
      estadisticas,
    };
  }

  @Post('reprocesar-rfcs')
  async reprocesarRfcs() {
    return this.xmlImportService.reprocesarRfcsExistentes();
  }

  /**
   * Completa XMLs importados sin datos financieros o sin uuid (solo los que lo necesitan).
   * POST /xml-import/completar            → cuenta del JWT
   * POST /xml-import/completar?todas=1    → todas las cuentas
   */
  @Post('completar')
  async completar(@Req() req: any, @Query('cuentaUid') cuentaUid?: string, @Query('todas') todas?: string) {
    const resultado = await this.xmlImportService.completarXmlsIncompletos(
      todas === '1' ? undefined : this.cuentaDe(req, cuentaUid),
    );
    return { success: true, resultado };
  }
}
