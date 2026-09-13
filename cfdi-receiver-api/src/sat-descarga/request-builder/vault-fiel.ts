import type { AxiosInstance } from 'axios';
import { Fiel } from './fiel';
import { RequestBuilderError } from './request-builder.error';

/** Respuesta de GET /internal/fiel/:cuentaUid en cert-vault-service */
export interface VaultFielMaterial {
  rfc: string;
  certificatePem: string;
  certificateSerialDecimal: string;
  certificateIssuerName: string;
  validUntil: string;
  descargaMasivaAutorizada: boolean;
}

export interface VaultFielOptions {
  baseUrl: string;
  serviceToken: string;
  /** Se envía a cert-vault para la bitácora fiel_usage_logs */
  requestType?: string;
  requestPeriod?: string;
  timeoutMs?: number;
}

/**
 * Fiel cuya llave privada vive en cert-vault-service: cada firma es una llamada
 * POST /internal/fiel/:cuentaUid/sign. El certificado (público) se obtiene una vez.
 *
 * sign() es síncrona en la interfaz Fiel, así que las firmas se resuelven
 * mediante prefirma: FielRequestBuilder llama a fiel.sign(signedInfo); aquí se
 * atiende desde una cache que se llena con prepare(). Ver VaultFiel.withSignatures().
 */
export class VaultFiel implements Fiel {
  private readonly signatures = new Map<string, Buffer>();

  private constructor(
    readonly cuentaUid: string,
    private readonly material: VaultFielMaterial,
    private readonly http: AxiosInstance,
    private readonly options: VaultFielOptions,
  ) {}

  static async load(http: AxiosInstance, cuentaUid: string, options: VaultFielOptions): Promise<VaultFiel> {
    const res = await http.get<VaultFielMaterial>(`${options.baseUrl}/internal/fiel/${encodeURIComponent(cuentaUid)}`, {
      headers: { 'X-Service-Token': options.serviceToken },
      timeout: options.timeoutMs ?? 15_000,
      validateStatus: () => true,
    });
    if (res.status === 404) {
      throw new RequestBuilderError(`La cuenta ${cuentaUid} no tiene una e.firma activa en cert-vault`);
    }
    if (res.status === 403) {
      throw new RequestBuilderError(`La cuenta ${cuentaUid} no autorizó la descarga masiva automática`);
    }
    if (res.status !== 200 || !res.data?.certificatePem) {
      throw new RequestBuilderError(`cert-vault respondió ${res.status} al obtener la e.firma de ${cuentaUid}`);
    }
    return new VaultFiel(cuentaUid, res.data, http, options);
  }

  rfc(): string {
    return this.material.rfc.toUpperCase();
  }

  certificatePem(): string {
    return this.material.certificatePem;
  }

  certificateSerial(): string {
    return this.material.certificateSerialDecimal;
  }

  certificateIssuerName(): string {
    return this.material.certificateIssuerName;
  }

  isValid(now: Date = new Date()): boolean {
    return this.material.descargaMasivaAutorizada && new Date(this.material.validUntil).getTime() >= now.getTime();
  }

  /**
   * Firma remota. Debe haberse llamado antes a prepare(data) con exactamente
   * estos bytes; si no, lanza para evitar una firma silenciosamente vacía.
   */
  sign(data: string | Buffer): Buffer {
    const key = VaultFiel.keyOf(data);
    const cached = this.signatures.get(key);
    if (!cached) {
      throw new RequestBuilderError('VaultFiel.sign() sin prefirma: usa signRemote()/withSignatures() antes de construir el mensaje');
    }
    return cached;
  }

  /** Llama a cert-vault y guarda la firma para que sign() la devuelva */
  async signRemote(data: string | Buffer): Promise<Buffer> {
    const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8');
    const res = await this.http.post<{ signature: string }>(
      `${this.options.baseUrl}/internal/fiel/${encodeURIComponent(this.cuentaUid)}/sign`,
      {
        data: buffer.toString('base64'),
        algorithm: 'RSA-SHA1',
        requestType: this.options.requestType,
        requestPeriod: this.options.requestPeriod,
      },
      { headers: { 'X-Service-Token': this.options.serviceToken }, timeout: this.options.timeoutMs ?? 15_000, validateStatus: () => true },
    );
    if (res.status !== 200 || !res.data?.signature) {
      throw new RequestBuilderError(`cert-vault respondió ${res.status} al firmar para ${this.cuentaUid}`);
    }
    const signature = Buffer.from(res.data.signature, 'base64');
    this.signatures.set(VaultFiel.keyOf(buffer), signature);
    return signature;
  }

  private static keyOf(data: string | Buffer): string {
    return (Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8')).toString('base64');
  }
}
