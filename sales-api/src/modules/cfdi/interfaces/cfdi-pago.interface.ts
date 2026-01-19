import { CfdiBase } from './cfdi-base.interface';
export interface CfdiPago extends CfdiBase {
    tipoDeComprobante: 'P';
    complemento: {
      pagos: {
        version: string;
        totales: {
          totalRetencionesIVA: number;
          totalRetencionesISR: number;
          totalTrasladosBaseIVA16: number;
          totalTrasladosImpuestoIVA16: number;
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
          }>;
        }>;
      };
    };
  }