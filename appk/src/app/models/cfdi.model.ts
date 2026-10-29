export interface CFDI {
  xml?: string;
  ID: string;
  serie: string;
  folio: string;
  fecha: string;
  tipo: string;
  cliente: {
    ID?: number;
    nombre: string;
    rfc: string;
  };
  total: number;
  subtotal: number;
  impuestos: number;
  estado: string;
  uuid: string;
  
  // Añadir estas propiedades para evitar errores
  conceptos?: any[];
  items?: any[];
}