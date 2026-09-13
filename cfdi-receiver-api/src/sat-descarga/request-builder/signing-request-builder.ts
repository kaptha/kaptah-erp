import { VaultFiel } from './vault-fiel';
import { FielRequestBuilder } from './fiel-request-builder';
import { QueryParametersView, RequestBuilder } from './request-builder.interface';
import { RequestBuilderError } from './request-builder.error';

/**
 * RequestBuilder asíncrono para firma remota.
 *
 * FielRequestBuilder es síncrono (firma en memoria). Con VaultFiel la firma es una
 * llamada HTTP, así que este adaptador hace dos pasadas: la primera construye el
 * mensaje y captura qué bytes hay que firmar, la segunda lo construye ya con la
 * firma real obtenida de cert-vault. El XML resultante es idéntico al de LocalFiel.
 */
export class AsyncRequestBuilder {
  private readonly inner: FielRequestBuilder;

  constructor(private readonly fiel: VaultFiel) {
    this.inner = new FielRequestBuilder(fiel);
  }

  authorization(created: Date, expires: Date, securityTokenId = ''): Promise<string> {
    const tokenId = securityTokenId || FielRequestBuilder.createXmlSecurityTokenId();
    return this.build((b) => b.authorization(created, expires, tokenId));
  }

  query(parameters: QueryParametersView): Promise<string> {
    return this.build((b) => b.query(parameters));
  }

  verify(requestId: string): Promise<string> {
    return this.build((b) => b.verify(requestId));
  }

  download(packageId: string): Promise<string> {
    return this.build((b) => b.download(packageId));
  }

  /** Vista síncrona para las funciones authenticate/query/verify/download tras prefirmar */
  asSync(): RequestBuilder {
    return this.inner;
  }

  private async build(fn: (b: FielRequestBuilder) => string): Promise<string> {
    // Pasada 1: capturar los bytes a firmar
    const captured: Array<string | Buffer> = [];
    const probe = new FielRequestBuilder(new CapturingFiel(this.fiel, captured));
    fn(probe);
    if (captured.length !== 1) {
      throw new RequestBuilderError(`Se esperaba exactamente una firma, se capturaron ${captured.length}`);
    }
    // Firma remota (queda en cache de VaultFiel)
    await this.fiel.signRemote(captured[0]);
    // Pasada 2: mensaje real
    return fn(this.inner);
  }
}

/** Fiel que no firma: registra qué se le pidió firmar y devuelve un placeholder */
class CapturingFiel {
  constructor(
    private readonly real: VaultFiel,
    private readonly captured: Array<string | Buffer>,
  ) {}
  rfc() { return this.real.rfc(); }
  certificatePem() { return this.real.certificatePem(); }
  certificateSerial() { return this.real.certificateSerial(); }
  certificateIssuerName() { return this.real.certificateIssuerName(); }
  isValid() { return this.real.isValid(); }
  sign(data: string | Buffer): Buffer {
    this.captured.push(data);
    return Buffer.alloc(0);
  }
}
