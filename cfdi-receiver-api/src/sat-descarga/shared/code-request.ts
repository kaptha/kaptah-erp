/**
 * Catálogo de "CodigoEstadoSolicitud" de VerificaSolicitudDescarga.
 * Equivale a Shared/CodeRequest.php. Valores no catalogados → Unknown.
 */
export type CodeRequestName = 'Accepted' | 'Exhausted' | 'MaximumLimitReaded' | 'EmptyResult' | 'Duplicated' | 'Unknown';

interface Entry {
  name: CodeRequestName;
  message: string;
}

export class CodeRequest {
  private static readonly VALUES: Record<number, Entry> = {
    5000: { name: 'Accepted', message: 'Solicitud recibida con éxito' },
    5002: { name: 'Exhausted', message: 'Se agotó las solicitudes de por vida: Máximo para solicitudes con los mismos parámetros' },
    5003: { name: 'MaximumLimitReaded', message: 'Tope máximo: Indica que se está superando el tope máximo de CFDI o Metadata' },
    5004: { name: 'EmptyResult', message: 'No se encontró la información: Indica que no generó paquetes por falta de información.' },
    5005: { name: 'Duplicated', message: 'Solicitud duplicada: Si existe una solicitud vigente con los mismos parámetros' },
  };

  private static readonly UNKNOWN: Entry = { name: 'Unknown', message: 'Desconocida' };

  private constructor(
    readonly value: number,
    private readonly entry: Entry,
  ) {}

  static fromValue(value: number | string): CodeRequest {
    const n = typeof value === 'string' ? parseInt(value, 10) : value;
    return new CodeRequest(Number.isNaN(n) ? 0 : n, CodeRequest.VALUES[n] ?? CodeRequest.UNKNOWN);
  }

  get name(): CodeRequestName {
    return this.entry.name;
  }

  get message(): string {
    return this.entry.message;
  }

  isAccepted(): boolean { return this.entry.name === 'Accepted'; }
  isExhausted(): boolean { return this.entry.name === 'Exhausted'; }
  isMaximumLimitReaded(): boolean { return this.entry.name === 'MaximumLimitReaded'; }
  isEmptyResult(): boolean { return this.entry.name === 'EmptyResult'; }
  isDuplicated(): boolean { return this.entry.name === 'Duplicated'; }
  isUnknown(): boolean { return this.entry.name === 'Unknown'; }

  toJSON(): { value: number; name: CodeRequestName; message: string } {
    return { value: this.value, name: this.entry.name, message: this.entry.message };
  }
}
