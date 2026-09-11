import { StatusCode } from '../../shared/status-code';

/**
 * Resultado de SolicitaDescarga: estado y, si fue aceptada, el IdSolicitud para verificar.
 * Equivale a Services/Query/QueryResult.php.
 */
export class QueryResult {
  constructor(
    readonly status: StatusCode,
    readonly requestId: string,
  ) {}

  isAccepted(): boolean {
    return this.status.isAccepted() && this.requestId !== '';
  }

  toJSON(): { status: { code: number; message: string }; requestId: string } {
    return { status: this.status.toJSON(), requestId: this.requestId };
  }
}
