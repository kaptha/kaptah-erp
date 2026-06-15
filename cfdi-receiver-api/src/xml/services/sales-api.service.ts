import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export interface CfdiFromSales {
  folio_fiscal: string;
  serie?: string;
  folio?: string;
  fecha: string;
  moneda?: string;
  tipo_cambio?: number;
  sub_total: number;
  total: number;
  forma_pago?: string;
  metodo_pago?: string;
  rfc_emisor: string;
  nombre_emisor?: string;
  rfc_receptor: string;
  nombre_receptor?: string;
  total_impuestos_trasladados: number;
  total_impuestos_retenidos: number;
  iva_trasladado: number;
  iva_retenido: number;
  isr_retenido: number;
  ieps_retenido: number;
  tipo_comprobante: string;
  estado_procesamiento: string;
  conceptos_detalle?: any[];
  xml?: string;
  status?: string;
  fuente?: string;
}

@Injectable()
export class SalesApiService {
  private readonly logger = new Logger(SalesApiService.name);
  private readonly salesApiUrl = process.env.SALES_API_URL || 'https://extraordinary-beauty-production-78f6.up.railway.app';

  constructor(private readonly httpService: HttpService) {}

  /**
   * Mapea un CFDI de sales-api al formato XmlFinanciero esperado por el frontend
   */
  private mapCfdiToFinanciero(cfdi: any): CfdiFromSales {
    // Extraer IVA del XML si está disponible, sino estimar
    const subtotal = parseFloat(cfdi.subtotal) || 0;
    const total = parseFloat(cfdi.total) || 0;
    const ivaEstimado = parseFloat((total - subtotal).toFixed(2));

    return {
      folio_fiscal: cfdi.uuid || '',
      serie: cfdi.serie || '',
      folio: cfdi.folio || '',
      fecha: cfdi.fechaTimbrado || cfdi.createdAt || new Date().toISOString(),
      moneda: cfdi.moneda || 'MXN',
      tipo_cambio: parseFloat(cfdi.tipo_cambio) || 1,
      sub_total: subtotal,
      total: total,
      forma_pago: cfdi.forma_pago || '',
      metodo_pago: cfdi.metodo_pago || '',
      rfc_emisor: cfdi.emisor_rfc || '',
      nombre_emisor: cfdi.emisor_nombre || '',
      rfc_receptor: cfdi.receptor_rfc || '',
      nombre_receptor: cfdi.receptor_nombre || '',
      total_impuestos_trasladados: ivaEstimado > 0 ? ivaEstimado : 0,
      total_impuestos_retenidos: 0,
      iva_trasladado: ivaEstimado > 0 ? ivaEstimado : 0,
      iva_retenido: 0,
      isr_retenido: 0,
      ieps_retenido: 0,
      tipo_comprobante: cfdi.tipo_cfdi || 'I',
      estado_procesamiento: cfdi.status === 'timbrado' ? 'TIMBRADO' :
                            cfdi.status === 'cancelado' ? 'CANCELADO' : cfdi.status?.toUpperCase() || 'TIMBRADO',
      conceptos_detalle: [],
      xml: cfdi.xml || null,
      status: cfdi.status,
      fuente: 'sales-api',
    };
  }

  /**
   * Obtiene todos los CFDIs timbrados de un usuario desde sales-api
   */
  async getCfdisTimbrados(userUid: string, token: string, filtros?: {
    fechaInicio?: string;
    fechaFin?: string;
    query?: string;
    offset?: number;
    limit?: number;
  }): Promise<CfdiFromSales[]> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.salesApiUrl}/cfdi/list`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'x-internal-api-key': process.env.INTERNAL_API_KEY || '',
          },
          params: {
            cuentaUid: userUid,
          },
        })
      );

      let cfdis: any[] = Array.isArray(response.data) ? response.data : (response.data?.cfdis || []);

      // Solo ingresos timbrados o cancelados
      cfdis = cfdis.filter(c =>
        (c.status === 'timbrado' || c.status === 'cancelado') &&
        (c.tipo_cfdi === 'I' || c.tipo_cfdi === 'ingreso' || !c.tipo_cfdi)
      );

      // Filtrar por fecha si aplica
      if (filtros?.fechaInicio || filtros?.fechaFin) {
        const inicio = filtros.fechaInicio ? new Date(filtros.fechaInicio) : null;
        const fin = filtros.fechaFin ? new Date(filtros.fechaFin) : null;
        cfdis = cfdis.filter(c => {
          const fecha = new Date(c.fechaTimbrado || c.createdAt);
          if (inicio && fecha < inicio) return false;
          if (fin && fecha > fin) return false;
          return true;
        });
      }

      // Filtrar por query (UUID, RFC, nombre receptor, folio)
      if (filtros?.query) {
        const q = filtros.query.toLowerCase();
        cfdis = cfdis.filter(c =>
          (c.uuid || '').toLowerCase().includes(q) ||
          (c.receptor_rfc || '').toLowerCase().includes(q) ||
          (c.receptor_nombre || '').toLowerCase().includes(q) ||
          (c.folio || '').toLowerCase().includes(q) ||
          (c.serie || '').toLowerCase().includes(q)
        );
      }

      return cfdis.map(c => this.mapCfdiToFinanciero(c));
    } catch (error) {
      this.logger.error('Error obteniendo CFDIs de sales-api:', error?.message);
      return [];
    }
  }

  /**
   * Obtiene el detalle de un CFDI por UUID desde sales-api
   */
  async getCfdiByUuid(uuid: string, token: string): Promise<CfdiFromSales | null> {
    try {
      // El sales-api guarda por ID interno, no por UUID — buscamos en la lista
      const response = await firstValueFrom(
        this.httpService.get(`${this.salesApiUrl}/cfdi/list`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'x-internal-api-key': process.env.INTERNAL_API_KEY || '',
          },
        })
      );

      const cfdis: any[] = Array.isArray(response.data) ? response.data : (response.data?.cfdis || []);
      const found = cfdis.find(c => c.uuid === uuid);

      if (!found) return null;
      return this.mapCfdiToFinanciero(found);
    } catch (error) {
      this.logger.error(`Error buscando CFDI ${uuid} en sales-api:`, error?.message);
      return null;
    }
  }

  /**
   * Obtiene el XML crudo de un CFDI desde sales-api
   */
  async getXmlByCfdiUuid(uuid: string, token: string): Promise<string | null> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.salesApiUrl}/cfdi/list`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'x-internal-api-key': process.env.INTERNAL_API_KEY || '',
          },
        })
      );

      const cfdis: any[] = Array.isArray(response.data) ? response.data : (response.data?.cfdis || []);
      const found = cfdis.find(c => c.uuid === uuid);
      return found?.xml || null;
    } catch (error) {
      this.logger.error(`Error obteniendo XML de CFDI ${uuid}:`, error?.message);
      return null;
    }
  }

  /**
   * Extrae conceptos/partidas del XML de un CFDI
   */
  parseConceptosFromXml(xml: string): any[] {
    try {
      const conceptos: any[] = [];
      const conceptoRegex = /<cfdi:Concepto([^>]*)>/g;
      let match;

      while ((match = conceptoRegex.exec(xml)) !== null) {
        const attrs = match[1];
        const getValue = (attr: string) => {
          const m = attrs.match(new RegExp(`${attr}="([^"]*)"`));
          return m ? m[1] : '';
        };

        conceptos.push({
          descripcion: getValue('Descripcion'),
          cantidad: parseFloat(getValue('Cantidad')) || 1,
          valorUnitario: parseFloat(getValue('ValorUnitario')) || 0,
          importe: parseFloat(getValue('Importe')) || 0,
          claveUnidad: getValue('ClaveUnidad'),
          claveProdServ: getValue('ClaveProdServ'),
          unidad: getValue('Unidad'),
        });
      }

      return conceptos;
    } catch (error) {
      this.logger.error('Error parseando conceptos del XML:', error?.message);
      return [];
    }
  }

  /**
   * URL del PDF en sales-api (para redirect)
   */
  getPdfUrl(cfdiInternalId: string, style: string = 'classic'): string {
    return `${this.salesApiUrl}/cfdi/${cfdiInternalId}/pdf/${style}`;
  }
}