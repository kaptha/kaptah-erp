import { CfdiBase } from './cfdi-base.interface';
export interface CfdiIngreso extends CfdiBase {
    tipoDeComprobante: 'I';
    metodoPago: 'PUE' | 'PPD';
    formaPago: string;
    conceptos: Array<{
      claveProdServ: string;
      cantidad: number;
      claveUnidad: string;
      descripcion: string;
      valorUnitario: number;
      importe: number;
      objetoImp: string;
      impuestos?: {
        traslados?: Array<{
          base: number;
          impuesto: string;
          tipoFactor: string;
          tasaOCuota: number;
          importe: number;
        }>;
      };
    }>;
  }