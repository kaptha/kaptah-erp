import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DescargaSatService } from './descarga-sat.service';
import { XmlImportService } from '../xml/services/xml-import.service';
import { format, subDays, subMonths, startOfMonth } from 'date-fns';

@Injectable()
export class DescargaSatSyncService implements OnModuleInit {
  private readonly logger = new Logger(DescargaSatSyncService.name);
  private primeraEjecucion = true;

  constructor(
    private readonly descargaSatService: DescargaSatService,
    private readonly xmlImportService: XmlImportService,
  ) {}

  onModuleInit() {
    this.logger.log('=== DescargaSatSyncService INICIADO - Cron programado a las 2:00 AM UTC ===');
  }

  /**
   * Cron job - se ejecuta todos los dias a las 2:00 AM UTC
   */
  @Cron('0 2 * * *')
  async sincronizacionDiaria() {
    this.logger.log('=== Iniciando sincronizacion diaria de CFDIs ===');

    try {
      let fechaInicial: string;
      let fechaFinal: string;

      if (this.primeraEjecucion) {
        const inicioMesPasado = startOfMonth(subMonths(new Date(), 1));
        fechaInicial = format(inicioMesPasado, 'yyyy-MM-dd 00:00:00');
        fechaFinal = format(new Date(), 'yyyy-MM-dd 23:59:59');
        this.logger.log(`Primera ejecucion - descargando ultimo mes: ${fechaInicial} a ${fechaFinal}`);
        this.primeraEjecucion = false;
      } else {
        const ayer = subDays(new Date(), 1);
        fechaInicial = format(ayer, 'yyyy-MM-dd 00:00:00');
        fechaFinal = format(ayer, 'yyyy-MM-dd 23:59:59');
        this.logger.log(`Sincronizacion diaria - descargando: ${fechaInicial} a ${fechaFinal}`);
      }

      // Descargar RECIBIDOS
      await this.descargarYGuardar(fechaInicial, fechaFinal, 'R');

      // Descargar EMITIDOS
      await this.descargarYGuardar(fechaInicial, fechaFinal, 'E');

      this.logger.log('=== Sincronizacion diaria completada ===');
    } catch (error) {
      this.logger.error(`Error en sincronizacion diaria: ${error.message}`, error.stack);
    }
  }

  /**
   * Descargar CFDIs de SIFEI y guardarlos en BD
   */
  private async descargarYGuardar(
    fechaInicial: string,
    fechaFinal: string,
    tipo: 'E' | 'R',
  ) {
    const tipoNombre = tipo === 'E' ? 'EMITIDOS' : 'RECIBIDOS';
    this.logger.log(`--- Procesando ${tipoNombre} ---`);

    try {
      const resultado = await this.descargaSatService.descargarCfdis(
        fechaInicial,
        fechaFinal,
        tipo,
      );

      if (resultado.xmls.length === 0) {
        this.logger.log(`No hay CFDIs ${tipoNombre} para el periodo`);
        return;
      }

      this.logger.log(`${tipoNombre}: ${resultado.total} XMLs a procesar`);

      let procesados = 0;
      let errores = 0;

      for (const xmlContent of resultado.xmls) {
        try {
          await this.xmlImportService.procesarXmlDesdeContenido(xmlContent, 'SYNC_SIFEI');
          procesados++;
        } catch (error) {
          this.logger.error(`Error procesando XML: ${error.message}`);
          errores++;
        }
      }

      this.logger.log(`${tipoNombre} - Procesados: ${procesados}, Errores: ${errores}`);
    } catch (error) {
      this.logger.error(`Error descargando ${tipoNombre}: ${error.message}`);
    }
  }
}