/**
 * Estado del comprobante. Undefined = todos.
 * Equivale a Shared/DocumentStatus.php.
 */
export enum DocumentStatus {
  Undefined = '',
  Active = '1',
  Cancelled = '0',
}

/** Valor del atributo EstadoComprobante que espera el SAT */
export function documentStatusQueryValue(status: DocumentStatus): 'Todos' | 'Vigente' | 'Cancelado' {
  switch (status) {
    case DocumentStatus.Active:
      return 'Vigente';
    case DocumentStatus.Cancelled:
      return 'Cancelado';
    default:
      return 'Todos';
  }
}
