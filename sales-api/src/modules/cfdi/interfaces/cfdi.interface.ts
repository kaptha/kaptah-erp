export interface CfdiBase {
   uuid: string;
   version: string;
   serie?: string;
   folio?: string;
   fecha: Date;
   sello?: string;
   noCertificado: string;
   certificado?: string;
   subTotal: number;
   moneda: string;
   total: number;
   tipoDeComprobante: 'I' | 'E' | 'N' | 'P' | 'T';
   exportacion: string;
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
  }