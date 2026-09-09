/**
 * TipoDeComprobante del CFDI. Undefined = sin filtro.
 * Equivale a Shared/DocumentType.php.
 */
export enum DocumentType {
  Undefined = '',
  Ingreso = 'I',
  Egreso = 'E',
  Traslado = 'T',
  Nomina = 'N',
  Pago = 'P',
}
