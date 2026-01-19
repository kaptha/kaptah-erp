import { CfdiBase } from './cfdi-base.interface';
export interface CfdiIngreso extends CfdiBase {
    tipoComprobante: 'I';
    conceptos: Array<{
      claveProdServ: string;
      cantidad: number;
      claveUnidad: string;
      descripcion: string;
      valorUnitario: number;
      importe: number;
      impuestos?: {
        traslados?: Array<{ base: number; impuesto: string; tipoFactor: string; tasaOCuota: number; importe: number }>;
        retenciones?: Array<{ base: number; impuesto: string; tipoFactor: string; tasaOCuota: number; importe: number }>;
      };
    }>;
  }
  
  export interface CfdiEgreso extends CfdiBase {
    tipoComprobante: 'E';
    cfdiRelacionados: {
      tipoRelacion: string;
      uuid: string[];
    };
    // ... campos específicos para egresos
  }
  
  export interface CfdiTraslado extends CfdiBase {
    tipoComprobante: 'T';
    cartaPorte?: {
      // ... campos específicos para carta porte
    };
  }
  
  export interface CfdiNomina extends CfdiBase {
    tipoComprobante: 'N';
    nomina: {
      fechaPago: Date;
      fechaInicialPago: Date;
      fechaFinalPago: Date;
      numDiasPagados: number;
      // ... otros campos específicos de nómina
    };
  }
  
  export interface CfdiPago extends CfdiBase {
    tipoComprobante: 'P';
    pagos: {
      version: string;
      totales?: {
        totalRetencionesIVA: number;
        totalRetencionesISR: number;
        totalTrasladosBaseIVA16: number;
        totalTrasladosImpuestoIVA16: number;
        totalTrasladados: number;
        totalRetenciones: number;
      };
      pago: Array<{
        fechaPago: Date;
        formaDePagoP: string;
        monedaP: string;
        monto: number;
        doctoRelacionado: Array<{
          idDocumento: string;
          serie?: string;
          folio?: string;
          monedaDR: string;
          equivalenciaDR?: number;
          numParcialidad?: number;
          impSaldoAnt?: number;
          impPagado: number;
          impSaldoInsoluto?: number;
          objetoImpDR: string;
        }>;
      }>;
    };
  }