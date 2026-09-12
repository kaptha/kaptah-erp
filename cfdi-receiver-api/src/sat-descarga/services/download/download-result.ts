import { StatusCode } from '../../shared/status-code';

/**
 * Resultado de Descargar: estado y el ZIP del paquete como Buffer.
 * Equivale a Services/Download/DownloadResult.php.
 */
export class DownloadResult {
  readonly packageSize: number;

  constructor(
    readonly status: StatusCode,
    readonly packageContent: Buffer,
  ) {
    this.packageSize = packageContent.length;
  }

  /** true si el contenido empieza con la firma ZIP "PK" */
  isZip(): boolean {
    return this.packageSize >= 4 && this.packageContent[0] === 0x50 && this.packageContent[1] === 0x4b;
  }

  /** El JSON nunca incluye el contenido: solo estado y tamaño */
  toJSON(): { status: { code: number; message: string }; size: number } {
    return { status: this.status.toJSON(), size: this.packageSize };
  }
}
