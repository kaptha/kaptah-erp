export interface CFDIPago {
  // Datos generales
  ID?: number;
  serie: string;
  folio?: string;
  fecha: Date;
  tipo: string;
  
  // Datos de emisor
  sucursal: string;
  tipoDocumento: string;
  regimenFiscal: string;
  
  // Datos del cliente receptor
  cliente: {
    ID: number;
    nombre: string;
    rfc: string;
    // Otros datos del cliente
  };
  
  // Datos de pagos
  pagos: PagoCFDI[];
  
  // Totales
  monto: number;
  
  // Datos adicionales
  observaciones?: string;
}

export interface PagoCFDI {
  formaPago: string;
  fechaPago: Date;
  moneda: string;
  monto: number;
  rfcEmisorCuenta?: string;
  rfcBeneficiario?: string;
  numeroCuentaOrdenante?: string;
  numeroCuentaBeneficiario?: string;
  nombreBancoOrdenante?: string;
  numeroOperacion?: string;
  tipoCadenaPago?: string;
}

// Catálogos para selecciones en los formularios
export interface CatalogoPago {
  clave: string;
  descripcion: string;
}