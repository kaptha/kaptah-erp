/**
 * Tipo de solicitud: XML completos o solo metadata.
 * Equivale a Shared/RequestType.php.
 */
export enum RequestType {
  Xml = 'xml',
  Metadata = 'metadata',
}

/** Valor del atributo TipoSolicitud que espera el SAT */
export function requestTypeQueryValue(type: RequestType): 'CFDI' | 'Metadata' {
  return type === RequestType.Xml ? 'CFDI' : 'Metadata';
}
