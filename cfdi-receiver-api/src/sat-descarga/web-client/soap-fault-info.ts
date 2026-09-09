/**
 * faultcode + faultstring de un SOAP Fault.
 * Equivale a WebClient/SoapFaultInfo.php.
 */
export class SoapFaultInfo {
  constructor(
    readonly code: string,
    readonly message: string,
  ) {}

  toString(): string {
    return this.message;
  }

  toJSON(): { code: string; message: string } {
    return { code: this.code, message: this.message };
  }
}
