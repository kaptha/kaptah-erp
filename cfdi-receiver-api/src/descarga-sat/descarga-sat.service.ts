import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import * as AdmZip from 'adm-zip';

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
   * Descargar CFDIs por rango de fechas - retorna ZIP con XMLs
   * @param fechaInicial formato YYYY-MM-DD hh:mm:ss
   * @param fechaFinal formato YYYY-MM-DD hh:mm:ss
   * @param emitidoRecibido 'E' = Emitidos, 'R' = Recibidos
   */
  async descargarCfdis(
    fechaInicial: string,
    fechaFinal: string,
    emitidoRecibido: 'E' | 'R',
  ): Promise<{ status: string; xmls: string[]; total: number }> {
    const url = `${this.baseUrl}/api/v2/descargasatsifei/cfdi/download`;
    const tipo = emitidoRecibido === 'E' ? 'EMITIDOS' : 'RECIBIDOS';
    this.logger.log(`Descargando CFDIs ${tipo}: ${fechaInicial} - ${fechaFinal}`);

    try {
      const { data } = await firstValueFrom(
        this.httpService.post(
          url,
          {
            fechaInicial,
            fechaFinal,
            emitidoRecibido,
          },
          { headers: this.getHeaders() },
        ),
      );

      if (data.status === 'success' && data.data) {
        // Decodificar ZIP de Base64 y extraer XMLs
        const xmls = this.extraerXmlsDeZip(data.data);
        this.logger.log(`CFDIs ${tipo} descargados: ${xmls.length} XMLs extraidos`);
        return { status: 'success', xmls, total: xmls.length };
      }

      if (data.code === '2204') {
        this.logger.log(`No hay CFDIs ${tipo} para el periodo solicitado`);
        return { status: 'success', xmls: [], total: 0 };
      }

      this.logger.warn(`Respuesta inesperada de SIFEI: ${data.status} - ${data.message}`);
      return { status: data.status, xmls: [], total: 0 };
    } catch (error) {
      this.logger.error(`Error al descargar CFDIs ${tipo}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Extraer archivos XML de un ZIP codificado en Base64
   */
  private extraerXmlsDeZip(zipBase64: string): string[] {
    try {
      const zipBuffer = Buffer.from(zipBase64, 'base64');
      const zip = new AdmZip(zipBuffer);
      const entries = zip.getEntries();
      const xmls: string[] = [];

      for (const entry of entries) {
        if (entry.entryName.toLowerCase().endsWith('.xml') && !entry.isDirectory) {
          const xmlContent = entry.getData().toString('utf-8');
          xmls.push(xmlContent);
        }
      }

      return xmls;
    } catch (error) {
      this.logger.error(`Error al extraer XMLs del ZIP: ${error.message}`);
      return [];
    }
  }

  /**
   * Consultar estado de descargas programadas
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

      return data;
    } catch (error) {
      this.logger.error(`Error al consultar descargas: ${error.message}`);
      throw error;
    }
  }

  /**
   * Subir e-firma (CER + KEY) a SIFEI para vincular RFC
   */
  async subirEfirma(cerBase64: string, keyBase64: string, password: string) {
    const url = `${this.baseUrl}/api/v2/descargasatsifei/certificado`;
    this.logger.log('Subiendo e-firma a SIFEI');

    try {
      const { data } = await firstValueFrom(
        this.httpService.post(
          url,
          {
            cert: cerBase64,
            key: keyBase64,
            pass: password,
          },
          { headers: this.getHeaders() },
        ),
      );

      this.logger.log(`Respuesta subir e-firma: ${data.status} - ${data.message}`);
      return data;
    } catch (error) {
      this.logger.error(`Error al subir e-firma: ${error.message}`);
      throw error;
    }
  }
}