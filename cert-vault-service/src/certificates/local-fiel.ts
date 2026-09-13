import { X509Certificate, KeyObject, createPrivateKey, createSign } from 'node:crypto';

/**
 * e.firma (FIEL) del contribuyente: lo que el RequestBuilder necesita para firmar.
 * Equivale a FielRequestBuilder/Fiel.php (basado en phpcfdi/credentials).
 *
 * Es una interfaz para que LocalFiel (llave en memoria, node:crypto) y una futura
 * VaultFiel (firma delegada a cert-vault-service) sean intercambiables.
 */
export interface Fiel {
  /** RFC del titular, en mayúsculas */
  rfc(): string;
  /** Certificado en PEM (con cabeceras) */
  certificatePem(): string;
  /** Número de serie en decimal, como lo exige X509SerialNumber */
  certificateSerial(): string;
  /** Emisor en formato "CN=...,O=...,..." como lo exige X509IssuerName */
  certificateIssuerName(): string;
  /** Firma RSA-SHA1 (única que acepta el SAT en este servicio) */
  sign(data: string | Buffer): Buffer;
  /** true si es FIEL (no CSD) y está vigente hoy */
  isValid(now?: Date): boolean;
}

export type CertificateInput = string | Buffer;

/**
 * Fiel con la llave privada en memoria del proceso.
 * Acepta certificado en PEM, DER o DER-base64, y llave en PKCS#8 DER cifrado
 * (el .key que entrega el SAT), PKCS#8 PEM o PKCS#5 PEM.
 */
export class LocalFiel implements Fiel {
  private constructor(
    private readonly certificate: X509Certificate,
    private readonly privateKey: KeyObject,
  ) {}

  static create(certificateContents: CertificateInput, privateKeyContents: CertificateInput, passPhrase: string): LocalFiel {
    const certificate = new X509Certificate(LocalFiel.toDerOrPem(certificateContents));
    const privateKey = LocalFiel.loadPrivateKey(privateKeyContents, passPhrase);
    if (!certificate.checkPrivateKey(privateKey)) {
      throw new Error('La llave privada no corresponde al certificado');
    }
    return new LocalFiel(certificate, privateKey);
  }

  rfc(): string {
    // Subject del SAT: x500UniqueIdentifier=RFC / CURP
    const line = this.subjectLines().find((l) => l.toLowerCase().startsWith('x500uniqueidentifier='));
    if (!line) {
      throw new Error('El certificado no contiene x500UniqueIdentifier (RFC)');
    }
    const value = line.slice(line.indexOf('=') + 1);
    return value.split('/')[0].trim().toUpperCase();
  }

  certificatePem(): string {
    return this.certificate.toString();
  }

  certificateSerial(): string {
    return BigInt(`0x${this.certificate.serialNumber}`).toString(10);
  }

  certificateIssuerName(): string {
    return this.certificate.issuer.split('\n').filter((l) => l !== '').join(',');
  }

  sign(data: string | Buffer): Buffer {
    const signer = createSign('RSA-SHA1');
    signer.update(data);
    return signer.sign(this.privateKey);
  }

  /**
   * FIEL vs CSD: los CSD del SAT llevan OU (sucursal) en el subject; la FIEL no.
   * Misma heurística que phpcfdi/credentials.
   */
  isFiel(): boolean {
    return !this.subjectLines().some((l) => l.startsWith('OU='));
  }

  isValid(now: Date = new Date()): boolean {
    if (!this.isFiel()) return false;
    const from = new Date(this.certificate.validFrom).getTime();
    const to = new Date(this.certificate.validTo).getTime();
    const t = now.getTime();
    return t >= from && t <= to;
  }

  validTo(): Date {
    return new Date(this.certificate.validTo);
  }

  private subjectLines(): string[] {
    return this.certificate.subject.split('\n');
  }

  private static toDerOrPem(input: CertificateInput): Buffer | string {
    if (Buffer.isBuffer(input)) {
      return input;
    }
    const trimmed = input.trim();
    if (trimmed.startsWith('-----')) {
      return trimmed;
    }
    if (/^[A-Za-z0-9+/=\s]+$/.test(trimmed)) {
      return Buffer.from(trimmed.replace(/\s/g, ''), 'base64');
    }
    return Buffer.from(input, 'binary');
  }

  private static loadPrivateKey(input: CertificateInput, passPhrase: string): KeyObject {
    const isPem = typeof input === 'string' && input.trim().startsWith('-----');
    if (isPem) {
      return createPrivateKey({ key: input as string, format: 'pem', passphrase: passPhrase || undefined });
    }
    const der = Buffer.isBuffer(input) ? input : LocalFiel.toDerOrPem(input);
    return createPrivateKey({ key: der as Buffer, format: 'der', type: 'pkcs8', passphrase: passPhrase || undefined });
  }
}
