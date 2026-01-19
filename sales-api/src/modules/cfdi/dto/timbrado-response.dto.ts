export interface TimbradoResponseDto {
  success: boolean;
  uuid: string;
  fechaTimbrado: string;
  noCertificadoSAT: string;
  selloSAT: string;
  rfcProvCertif: string;
  timbreFiscalXml: string; // Nodo completo del timbre
  mensaje?: string;
  error?: string;
}

export interface SifeiSoapResponse {
  UUID: string;
  FechaTimbrado: string;
  NoCertificadoSAT: string;
  SelloSAT: string;
  RfcProvCertif: string;
  TimbreFiscalDigital: string;
  Mensaje?: string;
  Error?: string;
}