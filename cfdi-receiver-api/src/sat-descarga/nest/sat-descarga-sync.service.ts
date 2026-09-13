import { HttpService } from '@nestjs/axios';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SatDescargaConfig } from './sat-descarga.config';
import { SatDescargaService } from './sat-descarga.service';

/**
 * Crons del módulo. Se activan solo con SAT_DESCARGA_CRON_ENABLED=true.
 *
 *  - Diario 03:15 UTC: presenta solicitudes de AYER (recibidos y emitidos, CFDI) por cuenta.
 *  - Cada 30 min: verifica las ENVIADAS; descarga e importa las LISTAS.
 *
 * Nada aquí es petición-respuesta: el SAT tarda horas o días.
 */
@Injectable()
export class SatDescargaSyncService implements OnModuleInit {
  private readonly logger = new Logger(SatDescargaSyncService.name);
  private corriendo = false;

  constructor(
    private readonly service: SatDescargaService,
    private readonly config: SatDescargaConfig,
    private readonly http: HttpService,
  ) {}

  onModuleInit(): void {
    this.logger.log(`SatDescargaSyncService: crons ${this.config.cronEnabled ? 'ACTIVOS' : 'desactivados (SAT_DESCARGA_CRON_ENABLED != true)'}`);
  }

  @Cron('15 3 * * *')
  async solicitarDiario(): Promise<void> {
    if (!this.config.cronEnabled) return;
    const ayer = new Date(Date.now() - 24 * 60 * 60 * 1000);
    // Fecha en hora de México (UTC-6) para no cortar el día a las 18:00 locales
    const mx = new Date(ayer.getTime() - 6 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const cuentas = await this.cuentasAutorizadas();
    this.logger.log(`Solicitud diaria ${mx}: ${cuentas.length} cuenta(s)`);
    for (const cuentaUid of cuentas) {
      for (const tipo of ['RECIBIDOS', 'EMITIDOS'] as const) {
        try {
          await this.service.solicitar({ cuentaUid, tipo, tipoSolicitud: 'CFDI', fechaInicial: mx, fechaFinal: mx, origen: 'CRON' });
        } catch (error) {
          this.logger.warn(`Cuenta ${cuentaUid} ${tipo} ${mx}: ${(error as Error).message}`);
        }
      }
    }
  }

  @Cron('*/30 * * * *')
  async procesarPendientes(): Promise<void> {
    if (!this.config.cronEnabled || this.corriendo) return;
    this.corriendo = true;
    try {
      const pendientes = await this.service.pendientes();
      if (pendientes.length) this.logger.log(`Procesando ${pendientes.length} solicitud(es) pendiente(s)`);
      for (const s of pendientes) {
        try {
          const v = s.estado === 'ENVIADA' ? await this.service.verificar(s) : s;
          if (v.estado === 'LISTA' || v.estado === 'DESCARGANDO') {
            await this.service.descargarEImportar(v);
          }
        } catch (error) {
          this.logger.error(`Solicitud ${s.idSolicitud}: ${(error as Error).message}`);
        }
      }
    } finally {
      this.corriendo = false;
    }
  }

  /** Cuentas piloto de la variable de entorno, o todas las que autorizaron descarga masiva en cert-vault */
  private async cuentasAutorizadas(): Promise<string[]> {
    if (this.config.cuentasPiloto.length) return this.config.cuentasPiloto;
    try {
      const res = await this.http.axiosRef.get<Array<{ userId: string }>>(`${this.config.certVaultUrl}/internal/fiel`, {
        headers: { 'X-Service-Token': this.config.certVaultServiceToken },
        timeout: 15_000,
      });
      return res.data.map((f) => f.userId);
    } catch (error) {
      this.logger.error(`No se pudo obtener la lista de cuentas de cert-vault: ${(error as Error).message}`);
      return [];
    }
  }
}
