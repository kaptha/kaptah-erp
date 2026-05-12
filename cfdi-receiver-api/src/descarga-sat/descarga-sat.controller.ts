import { Controller, Post, Get, Body, UseGuards, Query } from '@nestjs/common';
import { DescargaSatService } from './descarga-sat.service';
import { DescargaSatSyncService } from './descarga-sat-sync.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('descarga-sat')
@UseGuards(JwtAuthGuard)
export class DescargaSatController {
  constructor(
    private readonly descargaSatService: DescargaSatService,
    private readonly descargaSatSyncService: DescargaSatSyncService,
  ) {}

  /**
   * Forzar sincronizacion manual desde el frontend
   * POST /descarga-sat/sincronizar
   */
  @Post('sincronizar')
  async sincronizarManual() {
    // Ejecutar el mismo flujo del cron pero bajo demanda
    await this.descargaSatSyncService.sincronizacionDiaria();
    return {
      status: 'success',
      message: 'Sincronizacion iniciada correctamente',
    };
  }

  /**
   * Consultar estado de descargas programadas
   * GET /descarga-sat/estado?estado=COMPLETADO
   */
  @Get('estado')
  async consultarEstado(@Query('estado') estado?: string) {
    return await this.descargaSatService.consultarDescargas(estado);
  }

  /**
   * Programar descarga manual con rango de fechas
   * POST /descarga-sat/programar
   */
  @Post('programar')
  async programarDescarga(
    @Body() body: { fechaInicial: string; fechaFinal: string; tipo: 'EMITIDOS' | 'RECIBIDOS' },
  ) {
    return await this.descargaSatService.programarDescarga(
      body.fechaInicial,
      body.fechaFinal,
      body.tipo,
    );
  }

  /**
   * Subir e-firma para vincular RFC en SIFEI
   * POST /descarga-sat/efirma
   */
  @Post('efirma')
  async subirEfirma(
    @Body() body: { certificado: string; llave: string; password: string },
  ) {
    return await this.descargaSatService.subirEfirma(
      body.certificado,
      body.llave,
      body.password,
    );
  }
}