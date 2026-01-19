export interface Proveedor {
  ID?: number;
  
  // Información básica
  nombre: string;
  razon_social: string;
  email: string;
  telefono: string;
  
  // Información fiscal
  rfc: string;
  regimen_fiscal: string; // Ahora guarda solo la clave de 3 caracteres (ej: "601", "612")
  tipo_contribuyente: 'fisica' | 'moral';
  
  // Dirección
  Cpostal: string; // ← Cambiado de codigoPostal a Cpostal para coincidir con backend
  colonia: string;
  calle: string;
  numero_ext: string;
  numero_int?: string;
  municipio: string;
  estado: string;
  pais?: string;
  
  // Datos bancarios
  banco: string;
  cuenta_bancaria: string;
  tipo_cuenta: 'cheques' | 'ahorro';
  clabe?: string;
  beneficiario: string;
  
  // Datos comerciales
  limite_credito: number;
  dias_credito: number;
  estado_proveedor?: 'activo' | 'inactivo';
  categoria?: string;
  notas?: string;
  
  // Metadatos
  fecha_registro?: Date;
  activo?: boolean;
  userId?: number;
  isEditing?: boolean;
}