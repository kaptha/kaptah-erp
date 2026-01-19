export interface Cliente {
  ID: number;
  nombre: string;
  Rfc: string;
  tipoPersona: 'fisica' | 'moral';
  RegFiscal: string;
  email: string;
  Telefono: string;
  Direccion: string; 
  Ciudad: string; 
  Cpostal: string;
  Colonia: string;
  isEditing?: boolean;
}