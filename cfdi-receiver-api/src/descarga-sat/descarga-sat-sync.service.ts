import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DescargaSatService } from './descarga-sat.service';
import { XmlImportService } from '../xml/services/xml-import.service';
import { format, subDays, subMonths, startOfMonth } from 'date-fns';

@Injectable()
export class DescargaSatSyncService {
  private readonly logger = new Logger(DescargaSatSyncService.name);
  private primeraEjecucion = true;

  constructor(
    private readonly descargaSatService: DescargaSatService,
    private readonly xmlImportService: XmlImportService,
  ) {}

  /**
   * Cron job - se ejecuta todos los dias a las 2:00 AM
   */
  @Cron('0 2 * * *')
  async sincronizacionDiaria() {
    this.logger.log('=== Iniciando sincronizacion diaria de CFDIs ===');

    try {
      let fechaInicial: string;
      let fechaFinal: string;

      if (this.primeraEjecucion) {
        // Primera vez: traer ultimo mes completo
        const inicioMesPasado = startOfMonth(subMonths(new Date(), 1));
        fechaInicial = format(inicioMesPasado, 'yyyy-MM-dd 00:00:00');
        fechaFinal = format(new Date(), 'yyyy-MM-dd 23:59:59');
        this.logger.log(`Primera ejecucion - descargando ultimo mes: ${fechaInicial} a ${fechaFinal}`);
        this.primeraEjecucion = false;
      } else {
        // Ejecuciones siguientes: solo el dia anterior
        const ayer = subDays(new Date(), 1);
        fechaInicial = format(ayer, 'yyyy-MM-dd 00:00:00');
        fechaFinal = format(ayer, 'yyyy-MM-dd 23:59:59');
        this.logger.log(`Sincronizacion diaria - descargando: ${fechaInicial} a ${fechaFinal}`);
      }

      // Paso 1: Programar descarga de RECIBIDOS
      await this.programarYProcesar(fechaInicial, fechaFinal, 'RECIBIDOS');

      // Paso 2: Programar descarga de EMITIDOS
      await this.programarYProcesar(fechaInicial, fechaFinal, 'EMITIDOS');

      this.logger.log('=== Sincronizacion diaria completada ===');
    } catch (error) {
      this.logger.error(`Error en sincronizacion diaria: ${error.message}`, error.stack);
    }
  }

  /**
   * Programar descarga, esperar a que complete, y procesar los XMLs
   */
  private async programarYProcesar(
    fechaInicial: string,
    fechaFinal: string,
    tipo: 'EMITIDOS' | 'RECIBIDOS',
  ) {
    this.logger.log(`--- Procesando ${tipo} ---`);

    try {
      // Programar la descarga en SIFEI
      const respProgramar = await this.descargaSatService.programarDescarga(
        fechaInicial,
        fechaFinal,
        tipo,
      );

      if (respProgramar.status !== 'success') {
        // Codigo 2101 = descarga repetida, no es error real
        if (respProgramar.code === 2101) {
          this.logger.warn(`Descarga ${tipo} ya fue programada previamente, consultando estado...`);
        } else {
          this.logger.error(`Error al programar descarga ${tipo}: ${respProgramar.message}`);
          return;
        }
      }

      // Polling: esperar a que la descarga se complete
      await this.esperarDescargaCompletada(tipo);

      // Descargar y procesar los CFDIs
      await this.descargarYGuardarCfdis();

    } catch (error) {
      this.logger.error(`Error procesando ${tipo}: ${error.message}`);
    }
  }

  /**
   * Poll cada 30 segundos hasta que SIFEI reporte la descarga como COMPLETADA
   * Maximo 20 intentos (10 minutos)
   */
  private async esperarDescargaCompletada(tipo: string, maxIntentos = 20) {
    for (let i = 0; i < maxIntentos; i++) {
      this.logger.log(`Consultando estado de descarga ${tipo} - intento ${i + 1}/${maxIntentos}`);

      const resp = await this.descargaSatService.consultarDescargas('COMPLETADO');

      if (resp.status === 'success' && resp.data && resp.data.length > 0) {
        this.logger.log(`Descarga ${tipo} completada`);
        return;
      }

      // Esperar 30 segundos antes del siguiente intento
      await this.sleep(30000);
    }

    this.logger.warn(`Descarga ${tipo} no se completo despues de ${maxIntentos} intentos`);
  }

  /**
   * Descargar los CFDIs disponibles y guardarlos via XmlImportService
   */
  private async descargarYGuardarCfdis() {
    try {
      const listado = await this.descargaSatService.obtenerListadoCfdis(1, 100);

      if (listado.status !== 'success' || !listado.data || listado.data.length === 0) {
        this.logger.log('No hay CFDIs nuevos para descargar');
        return;
      }

      this.logger.log(`CFDIs disponibles para descarga: ${listado.data.length}`);

      let procesados = 0;
      let errores = 0;

      for (const cfdi of listado.data) {
        try {
          const resultado = await this.descargaSatService.descargarCfdiPorUuid(cfdi.uuid);

          if (resultado.status === 'success' && resultado.xml) {
            // Reutilizar el XmlImportService existente para parsear y guardar
            await this.xmlImportService.procesarXmlDesdeContenido(
  resultado.xml,
  cfdi.rfcEmisor || 'SYNC',
);
            procesados++;
          }
        } catch (error) {
          this.logger.error(`Error descargando CFDI ${cfdi.uuid}: ${error.message}`);
          errores++;
        }
      }

      this.logger.log(`Procesados: ${procesados}, Errores: ${errores}`);
    } catch (error) {
      this.logger.error(`Error al descargar y guardar CFDIs: ${error.message}`);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}