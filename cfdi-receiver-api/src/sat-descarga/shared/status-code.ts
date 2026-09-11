/**
 * CodEstatus + Mensaje que devuelven Query y Verify.
 * El único código de éxito es 5000 ("Solicitud Aceptada").
 * Equivale a Shared/StatusCode.php.
 */
export class StatusCode {
  static readonly ACCEPTED = 5000;

  constructor(
    readonly code: number,
    readonly message: string,
  ) {}

  isAccepted(): boolean {
    return this.code === StatusCode.ACCEPTED;
  }

  toJSON(): { code: number; message: string } {
    return { code: this.code, message: this.message };
  }
}
