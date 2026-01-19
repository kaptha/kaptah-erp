export class CreateIngresoCfdiDto {
  serie: string;
  folio: string;
  moneda: string;
  tipoCambio?: number;
  exportacion: string;
  metodoPago: 'PUE' | 'PPD';
  formaPago: string;
  lugarExpedicion: string;
  
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
      retenciones?: Array<{
        base: number;
        impuesto: string;
        tipoFactor: string;
        tasaOCuota: number;
        importe: number;
      }>;
    };
  }>;

  // Calculados automáticamente
  subtotal?: number;
  total?: number;
  // ⭐ NUEVO: Contraseña del certificado CSD
  csdPassword: string;
}