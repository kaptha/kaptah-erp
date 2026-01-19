export interface TimbradoResponse {
  uuid: string;
  status: string;
  cadenaOriginal?: string;
  selloCFD?: string;
  selloSAT?: string;
  noCertificadoSAT?: string;
  fechaTimbrado: string;
  pdfUrl?: string;
  xmlUrl?: string;    
  xml: string;  // El XML timbrado
  qrCode?: string;
}

export interface TimbradoConcepto {
  claveProdServ: string;
  cantidad: number;
  claveUnidad: string;
  descripcion: string;
  valorUnitario: number;
  importe: number;
  descuento?: number;
  objetoImp: string;
  // Campos adicionales para mantener compatibilidad con ReportsService
  productId: string;  // Mantener para compatibilidad
  quantity: number;   // Alias de cantidad
  subtotal: number;   // Alias de importe
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
}

export interface Timbrado {
  id: string;
  uuid: string;
  xml: string;
  fechaTimbrado: string;
  total: number;
  subtotal: number;
  emisorRfc: string;
  receptorRfc: string;
  status: string;
  tipoComprobante: 'I' | 'E' | 'N' | 'P' | 'T';
  conceptos: TimbradoConcepto[];
  selloCFD?: string;
  selloSAT?: string;
  noCertificadoSAT?: string;
  cadenaOriginal?: string;
  createdBy: string;
  createdAt: Date;
  canceladoAt?: Date;
  motivoCancelacion?: string;
  // Campo adicional para mantener compatibilidad con ReportsService
  clientId: string;  // Mantener para compatibilidad
}