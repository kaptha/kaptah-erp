/**
 * Catálogo de "EstadoSolicitud" que devuelve VerificaSolicitudDescarga.
 * Equivale a Shared/StatusRequest.php (sin MicroCatalog).
 *
 * Un valor no catalogado no lanza error: se representa como Unknown,
 * porque el SAT puede agregar estados sin aviso.
 */
export type StatusRequestName =
  | 'Accepted'
  | 'InProgress'
  | 'Finished'
  | 'Failure'
  | 'Rejected'
  | 'Expired'
  | 'Unknown';

interface StatusRequestEntry {
  name: StatusRequestName;
  message: string;
}

export class StatusRequest {
  private static readonly VALUES: Record<number, StatusRequestEntry> = {
    1: { name: 'Accepted', message: 'Aceptada' },
    2: { name: 'InProgress', message: 'En proceso' },
    3: { name: 'Finished', message: 'Terminada' },
    4: { name: 'Failure', message: 'Error' },
    5: { name: 'Rejected', message: 'Rechazada' },
    6: { name: 'Expired', message: 'Vencida' },
  };

  private static readonly UNKNOWN: StatusRequestEntry = { name: 'Unknown', message: 'Desconocida' };

  private constructor(
    readonly value: number,
    private readonly entry: StatusRequestEntry,
  ) {}

  /** Acepta el número o el string tal como viene en el atributo XML */
  static fromValue(value: number | string): StatusRequest {
    const n = typeof value === 'string' ? parseInt(value, 10) : value;
    const entry = StatusRequest.VALUES[n] ?? StatusRequest.UNKNOWN;
    return new StatusRequest(Number.isNaN(n) ? 0 : n, entry);
  }

  static entries(): ReadonlyArray<{ value: number } & StatusRequestEntry> {
    return Object.entries(StatusRequest.VALUES).map(([k, v]) => ({ value: +k, ...v }));
  }

  get name(): StatusRequestName {
    return this.entry.name;
  }

  /** Mensaje conocido en español */
  get message(): string {
    return this.entry.message;
  }

  isAccepted(): boolean {
    return this.entry.name === 'Accepted';
  }

  isInProgress(): boolean {
    return this.entry.name === 'InProgress';
  }

  isFinished(): boolean {
    return this.entry.name === 'Finished';
  }

  isFailure(): boolean {
    return this.entry.name === 'Failure';
  }

  isRejected(): boolean {
    return this.entry.name === 'Rejected';
  }

  isExpired(): boolean {
    return this.entry.name === 'Expired';
  }

  isUnknown(): boolean {
    return this.entry.name === 'Unknown';
  }

  /** true si ya no tiene sentido seguir haciendo polling (terminó, falló, se rechazó o venció) */
  isTerminal(): boolean {
    return this.isFinished() || this.isFailure() || this.isRejected() || this.isExpired();
  }

  toJSON(): { value: number; name: StatusRequestName; message: string } {
    return { value: this.value, name: this.entry.name, message: this.entry.message };
  }
}
