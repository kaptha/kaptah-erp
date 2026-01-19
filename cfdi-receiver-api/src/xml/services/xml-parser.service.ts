import { Injectable, Logger } from '@nestjs/common';
import * as xml2js from 'xml2js';

export interface ParsedXmlData {
  // Datos del comprobante
  folio?: string;
  serie?: string;
  fecha: Date;
  folioFiscal: string; // UUID
  
  // Datos financieros
  moneda: string;
  tipoCambio?: number;
  subTotal: number;
  descuento?: number;
  total: number;
  
  // Datos de pago
  formaPago?: string;
  metodoPago?: string;
  condicionesPago?: string;
  
  // Datos del emisor
  rfcEmisor: string;
  nombreEmisor?: string;
  regimenFiscalEmisor?: string;
  
  // Datos del receptor
  rfcReceptor: string;
  nombreReceptor?: string;
  usoCfdi?: string;
  
  // Impuestos
  totalImpuestosTrasladados?: number;
  totalImpuestosRetenidos?: number;
  ivaTrasladado?: number;
  ivaRetenido?: number;
  isrRetenido?: number;
  iepsRetenido?: number;
  
  // Conceptos
  conceptos: ConceptoXml[];
  
  // Metadatos
  version: string;
  tipoComprobante: string;
  lugarExpedicion?: string;
}

export interface ConceptoXml {
  claveProdServ?: string;
  noIdentificacion?: string;
  cantidad: number;
  claveUnidad?: string;
  unidad?: string;
  descripcion: string;
  valorUnitario: number;
  importe: number;
  descuento?: number;
  
  // Impuestos del concepto
  impuestosTrasladados?: ImpuestoConcepto[];
  impuestosRetenidos?: ImpuestoConcepto[];
}

export interface ImpuestoConcepto {
  base: number;
  impuesto: string; // IVA, ISR, IEPS, etc.
  tipoFactor: string; // Tasa, Cuota, Exento
  tasaOCuota?: number;
  importe?: number;
}

@Injectable()
export class XmlParserService {
  private readonly logger = new Logger(XmlParserService.name);

  /**
   * Parsea un XML completo y extrae todos los datos financieros
   */
  async parseXmlContent(xmlContent: string): Promise<ParsedXmlData> {
    try {
      const parser = new xml2js.Parser({ 
        explicitArray: false,
        mergeAttrs: true 
      });
      
      const result = await parser.parseStringPromise(xmlContent);
      const comprobante = result['cfdi:Comprobante'] || result.Comprobante;
      
      if (!comprobante) {
        throw new Error('No se encontró el nodo Comprobante en el XML');
      }

      return {
        // Datos básicos del comprobante
        folio: comprobante.Folio,
        serie: comprobante.Serie,
        fecha: new Date(comprobante.Fecha),
        folioFiscal: this.extractUUID(comprobante),
        
        // Datos financieros
        moneda: comprobante.Moneda || 'MXN',
        tipoCambio: comprobante.TipoCambio ? parseFloat(comprobante.TipoCambio) : undefined,
        subTotal: parseFloat(comprobante.SubTotal),
        descuento: comprobante.Descuento ? parseFloat(comprobante.Descuento) : undefined,
        total: parseFloat(comprobante.Total),
        
        // Datos de pago
        formaPago: comprobante.FormaPago,
        metodoPago: comprobante.MetodoPago,
        condicionesPago: comprobante.CondicionesDePago,
        
        // Datos del emisor
        rfcEmisor: this.extractEmisorData(comprobante).rfc,
        nombreEmisor: this.extractEmisorData(comprobante).nombre,
        regimenFiscalEmisor: this.extractEmisorData(comprobante).regimenFiscal,
        
        // Datos del receptor
        rfcReceptor: this.extractReceptorData(comprobante).rfc,
        nombreReceptor: this.extractReceptorData(comprobante).nombre,
        usoCfdi: this.extractReceptorData(comprobante).usoCfdi,
        
        // Impuestos
        ...this.extractImpuestos(comprobante),
        
        // Conceptos
        conceptos: this.extractConceptos(comprobante),
        
        // Metadatos
        version: comprobante.Version,
        tipoComprobante: comprobante.TipoDeComprobante,
        lugarExpedicion: comprobante.LugarExpedicion,
      };

    } catch (error) {
      this.logger.error(`Error parseando XML: ${error.message}`);
      throw new Error(`Error en el parsing del XML: ${error.message}`);
    }
  }

  /**
   * Extrae el UUID (Folio Fiscal) del XML
   */
  private extractUUID(comprobante: any): string {
    try {
      const complemento = comprobante['cfdi:Complemento'] || comprobante.Complemento;
      if (!complemento) return '';

      const timbreFiscal = complemento['tfd:TimbreFiscalDigital'] || 
                          complemento.TimbreFiscalDigital ||
                          complemento['cfdi:TimbreFiscalDigital'];

      return timbreFiscal?.UUID || '';
    } catch (error) {
      this.logger.warn(`No se pudo extraer UUID: ${error.message}`);
      return '';
    }
  }

  /**
   * Extrae datos del emisor
   */
  private extractEmisorData(comprobante: any) {
    const emisor = comprobante['cfdi:Emisor'] || comprobante.Emisor;
    
    return {
      rfc: emisor?.Rfc || '',
      nombre: emisor?.Nombre || '',
      regimenFiscal: emisor?.RegimenFiscal || '',
    };
  }

  /**
   * Extrae datos del receptor
   */
  private extractReceptorData(comprobante: any) {
    const receptor = comprobante['cfdi:Receptor'] || comprobante.Receptor;
    
    return {
      rfc: receptor?.Rfc || '',
      nombre: receptor?.Nombre || '',
      usoCfdi: receptor?.UsoCFDI || '',
    };
  }

  /**
   * Extrae todos los impuestos del comprobante
   */
  private extractImpuestos(comprobante: any) {
    try {
      const impuestos = comprobante['cfdi:Impuestos'] || comprobante.Impuestos;
      
      if (!impuestos) {
        return {
          totalImpuestosTrasladados: 0,
          totalImpuestosRetenidos: 0,
          ivaTrasladado: 0,
          ivaRetenido: 0,
          isrRetenido: 0,
          iepsRetenido: 0,
        };
      }

      const result = {
        totalImpuestosTrasladados: impuestos.TotalImpuestosTrasladados ? 
          parseFloat(impuestos.TotalImpuestosTrasladados) : 0,
        totalImpuestosRetenidos: impuestos.TotalImpuestosRetenidos ? 
          parseFloat(impuestos.TotalImpuestosRetenidos) : 0,
        ivaTrasladado: 0,
        ivaRetenido: 0,
        isrRetenido: 0,
        iepsRetenido: 0,
      };

      // Procesar impuestos trasladados
      const trasladados = impuestos['cfdi:Traslados'] || impuestos.Traslados;
      if (trasladados) {
        const traslados = Array.isArray(trasladados['cfdi:Traslado'] || trasladados.Traslado) ?
          trasladados['cfdi:Traslado'] || trasladados.Traslado :
          [trasladados['cfdi:Traslado'] || trasladados.Traslado];

        traslados.forEach((traslado: any) => {
          const impuesto = traslado?.Impuesto;
          const importe = traslado?.Importe ? parseFloat(traslado.Importe) : 0;

          if (impuesto === '002') { // IVA
            result.ivaTrasladado += importe;
          }
        });
      }

      // Procesar impuestos retenidos
      const retenidos = impuestos['cfdi:Retenciones'] || impuestos.Retenciones;
      if (retenidos) {
        const retenciones = Array.isArray(retenidos['cfdi:Retencion'] || retenidos.Retencion) ?
          retenidos['cfdi:Retencion'] || retenidos.Retencion :
          [retenidos['cfdi:Retencion'] || retenidos.Retencion];

        retenciones.forEach((retencion: any) => {
          const impuesto = retencion?.Impuesto;
          const importe = retencion?.Importe ? parseFloat(retencion.Importe) : 0;

          switch (impuesto) {
            case '002': // IVA
              result.ivaRetenido += importe;
              break;
            case '001': // ISR
              result.isrRetenido += importe;
              break;
            case '003': // IEPS
              result.iepsRetenido += importe;
              break;
          }
        });
      }

      return result;
    } catch (error) {
      this.logger.warn(`Error extrayendo impuestos: ${error.message}`);
      return {
        totalImpuestosTrasladados: 0,
        totalImpuestosRetenidos: 0,
        ivaTrasladado: 0,
        ivaRetenido: 0,
        isrRetenido: 0,
        iepsRetenido: 0,
      };
    }
  }

  /**
   * Extrae todos los conceptos del comprobante
   */
  private extractConceptos(comprobante: any): ConceptoXml[] {
    try {
      const conceptos = comprobante['cfdi:Conceptos'] || comprobante.Conceptos;
      if (!conceptos) return [];

      const conceptoList = Array.isArray(conceptos['cfdi:Concepto'] || conceptos.Concepto) ?
        conceptos['cfdi:Concepto'] || conceptos.Concepto :
        [conceptos['cfdi:Concepto'] || conceptos.Concepto];

      return conceptoList.map((concepto: any) => ({
        claveProdServ: concepto.ClaveProdServ,
        noIdentificacion: concepto.NoIdentificacion,
        cantidad: parseFloat(concepto.Cantidad),
        claveUnidad: concepto.ClaveUnidad,
        unidad: concepto.Unidad,
        descripcion: concepto.Descripcion || '',
        valorUnitario: parseFloat(concepto.ValorUnitario),
        importe: parseFloat(concepto.Importe),
        descuento: concepto.Descuento ? parseFloat(concepto.Descuento) : undefined,
        
        // TODO: Procesar impuestos de conceptos individuales
        impuestosTrasladados: [],
        impuestosRetenidos: [],
      }));
    } catch (error) {
      this.logger.warn(`Error extrayendo conceptos: ${error.message}`);
      return [];
    }
  }

  /**
   * Método de utilidad para obtener solo datos básicos (más rápido)
   */
  async parseBasicFinancialData(xmlContent: string) {
    try {
      const parser = new xml2js.Parser({ explicitArray: false, mergeAttrs: true });
      const result = await parser.parseStringPromise(xmlContent);
      const comprobante = result['cfdi:Comprobante'] || result.Comprobante;

      return {
        fecha: new Date(comprobante.Fecha),
        subTotal: parseFloat(comprobante.SubTotal),
        total: parseFloat(comprobante.Total),
        moneda: comprobante.Moneda || 'MXN',
        tipoComprobante: comprobante.TipoDeComprobante,
        rfcEmisor: (comprobante['cfdi:Emisor'] || comprobante.Emisor)?.Rfc || '',
        rfcReceptor: (comprobante['cfdi:Receptor'] || comprobante.Receptor)?.Rfc || '',
      };
    } catch (error) {
      this.logger.error(`Error en parsing básico: ${error.message}`);
      throw error;
    }
  }
}