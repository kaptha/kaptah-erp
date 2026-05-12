import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class DescargaSatService {
  private readonly logger = new Logger(DescargaSatService.name);
  private readonly baseUrl: string;
  private readonly token: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl = this.configService.get<string>('aciDescargaSat.baseUrl');
    this.token = this.configService.get<string>('aciDescargaSat.token');
  }

  private getHeaders() {
    return {
      Authorization: this.token,
      'Content-Type': 'application/json; charset=UTF-8',
    };
  }

  /**
   * Programar una descarga de CFDIs en SIFEI
   * @param fechaInicial formato YYYY-MM-DD hh:mm:ss
   * @param fechaFinal formato YYYY-MM-DD hh:mm:ss
   * @param tipoDescarga 'EMITIDOS' | 'RECIBIDOS'
   */
  async programarDescarga(
    fechaInicial: string,
    fechaFinal: string,
    tipoDescarga: 'EMITIDOS' | 'RECIBIDOS',
  ) {
    const url = `${this.baseUrl}/api/v2/descargasatsifei/DescargaProgramadas/create`;
    this.logger.log(`Programando descarga ${tipoDescarga}: ${fechaInicial} - ${fechaFinal}`);

    try {
      const { data } = await firstValueFrom(
        this.httpService.post(
          url,
          {
            FechaInicial: fechaInicial,
            FechaFinal: fechaFinal,
            TipoDeDescarga: tipoDescarga,
          },
          { headers: this.getHeaders() },
        ),
      );

      this.logger.log(`Respuesta programar descarga: ${data.status} - ${data.code}`);
      return data;
    } catch (error) {
      this.logger.error(`Error al programar descarga: ${error.message}`);
      throw error;
    }
  }

  /**
   * Consultar estado de descargas programadas
   * @param estado 'COMPLETADO' | 'EN_PROCESO' | 'ERROR' | 'BLOQUEADA' | 'INCOMPLETA'
   */
  async consultarDescargas(estado?: string) {
    const url = `${this.baseUrl}/api/v2/descargasatsifei/DescargaProgramadas/query`;
    this.logger.log(`Consultando descargas con estado: ${estado || 'TODOS'}`);

    try {
      const body: any = {};
      if (estado) {
        body.estadoDescarga = estado;
      }

      const { data } = await firstValueFrom(
        this.httpService.post(url, body, { headers: this.getHeaders() }),
      );

      this.logger.log(`Descargas encontradas: ${data.status}`);
      return data;
    } catch (error) {
      this.logger.error(`Error al consultar descargas: ${error.message}`);
      throw error;
    }
  }

  /**
   * Descargar un CFDI por UUID - retorna XML en Base64
   */
  async descargarCfdiPorUuid(uuid: string) {
    const url = `${this.baseUrl}/api/v2/descargasatsifei/cfdi/query/${uuid}`;
    this.logger.log(`Descargando CFDI: ${uuid}`);

    try {
      const { data } = await firstValueFrom(
        this.httpService.get(url, { headers: this.getHeaders() }),
      );

      if (data.status === 'success' && data.data) {
        // Decodificar Base64 a XML string
        const xmlString = Buffer.from(data.data, 'base64').toString('utf-8');
        return {
          status: 'success',
          uuid,
          xml: xmlString,
          raw: data,
        };
      }

      return data;
    } catch (error) {
      this.logger.error(`Error al descargar CFDI ${uuid}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtener listado de CFDIs disponibles para descarga
   */
  async obtenerListadoCfdis(pagina: number = 1, porPagina: number = 50) {
    const url = `${this.baseUrl}/api/v2/descargasatsifei/cfdi/list`;
    this.logger.log(`Obteniendo listado de CFDIs - Pagina ${pagina}`);

    try {
      const { data } = await firstValueFrom(
        this.httpService.post(
          url,
          { pagina, porPagina },
          { headers: this.getHeaders() },
        ),
      );

      return data;
    } catch (error) {
      this.logger.error(`Error al obtener listado de CFDIs: ${error.message}`);
      throw error;
    }
  }

  /**
   * Subir e-firma (CER + KEY) a SIFEI para vincular RFC
   */
  async subirEfirma(cerBase64: string, keyBase64: string, password: string) {
    const url = `${this.baseUrl}/api/v2/descargasatsifei/efirma/upload`;
    this.logger.log('Subiendo e-firma a SIFEI');

    try {
      const { data } = await firstValueFrom(
        this.httpService.post(
          url,
          {
            certificado: cerBase64,
            llave: keyBase64,
            password: password,
          },
          { headers: this.getHeaders() },
        ),
      );

      this.logger.log(`Respuesta subir e-firma: ${data.status}`);
      return data;
    } catch (error) {
      this.logger.error(`Error al subir e-firma: ${error.message}`);
      throw error;
    }
  }
}