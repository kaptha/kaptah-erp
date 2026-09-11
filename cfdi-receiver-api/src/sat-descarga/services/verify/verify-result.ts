import { CodeRequest } from '../../shared/code-request';
import { StatusCode } from '../../shared/status-code';
import { StatusRequest } from '../../shared/status-request';

/**
 * Resultado de VerificaSolicitudDescarga.
 * Equivale a Services/Verify/VerifyResult.php.
 *
 * - status: si la llamada de verificación fue aceptada (5000)
 * - statusRequest: estado de la solicitud (1 aceptada … 3 terminada … 6 vencida)
 * - codeRequest: detalle cuando la solicitud fue rechazada (5004 sin CFDI, 5005 duplicada…)
 */
export class VerifyResult {
  readonly packagesIds: ReadonlyArray<string>;

  constructor(
    readonly status: StatusCode,
    readonly statusRequest: StatusRequest,
    readonly codeRequest: CodeRequest,
    readonly numberCfdis: number,
    ...packagesIds: string[]
  ) {
    this.packagesIds = [...packagesIds];
  }

  countPackages(): number {
    return this.packagesIds.length;
  }

  /** Terminada y con paquetes: ya se puede descargar */
  isReadyToDownload(): boolean {
    return this.statusRequest.isFinished() && this.packagesIds.length > 0;
  }

  /** Ya no tiene sentido seguir verificando */
  isTerminal(): boolean {
    return this.statusRequest.isTerminal();
  }

  toJSON(): Record<string, unknown> {
    return {
      status: this.status.toJSON(),
      statusRequest: this.statusRequest.toJSON(),
      codeRequest: this.codeRequest.toJSON(),
      numberCfdis: this.numberCfdis,
      packagesIds: this.packagesIds,
    };
  }
}
