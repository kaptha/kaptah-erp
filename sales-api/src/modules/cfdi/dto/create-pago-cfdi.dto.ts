export class CreatePagoCfdiDto {
    serie: string;
    folio: string;
    moneda: string;
    exportacion: string;
    emisor: {
      rfc: string;
      nombre: string;
      regimenFiscal: string;
    };
    receptor: {
      rfc: string;
      nombre: string;
      domicilioFiscalReceptor: string;
      regimenFiscalReceptor: string;
      usoCFDI: string;
    };
    pagos: {
      totales: {
        totalTrasladosBaseIVA16: number;
        totalTrasladosImpuestoIVA16: number;
        totalTrasladosBaseIVA8: number;
        totalTrasladosImpuestoIVA8: number;
        totalTrasladosBaseIVA0: number;
        totalTrasladosImpuestoIVA0: number;
        totalTrasladosBaseIVAExento: number;
        montoTotalPagos: number;
      };
      pago: Array<{
        fechaPago: string;
        formaDePagoP: string;
        monedaP: string;
        tipoCambioP: number;
        monto: number;
        rfcEmisorCtaOrd?: string;
        nomBancoOrdExt?: string;
        ctaOrdenante?: string;
        rfcEmisorCtaBen?: string;
        ctaBeneficiario?: string;
        documentosRelacionados: Array<{
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
          impuestos?: {
            traslados?: Array<{
              baseDR: number;
              impuestoDR: string;
              tipoFactorDR: string;
              tasaOCuotaDR: number;
              importeDR: number;
            }>;
          };
        }>;
        impuestosP?: {
          trasladosP?: Array<{
            baseP: number;
            impuestoP: string;
            tipoFactorP: string;
            tasaOCuotaP: number;
            importeP: number;
          }>;
        };
      }>;
    };
  }