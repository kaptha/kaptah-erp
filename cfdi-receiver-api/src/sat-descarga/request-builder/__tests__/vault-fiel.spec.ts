import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import axios, { AxiosAdapter } from 'axios';
import { DateTimePeriod } from '../../shared/date-time-period';
import { DownloadType } from '../../shared/download-type';
import { RequestType } from '../../shared/request-type';
import { ServiceType } from '../../shared/service-type';
import { ComplementoCfdi } from '../../shared/complemento-cfdi';
import { DocumentStatus } from '../../shared/document-status';
import { DocumentType } from '../../shared/document-type';
import { Uuid } from '../../shared/uuid';
import { RfcOnBehalf } from '../../shared/rfc-filter';
import { RfcMatches } from '../../shared/rfc-matches';
import { LocalFiel } from '../fiel';
import { FielRequestBuilder } from '../fiel-request-builder';
import { RequestBuilderError } from '../request-builder.error';
import { AsyncRequestBuilder } from '../signing-request-builder';
import { VaultFiel } from '../vault-fiel';

const F = join(__dirname, '_files');
const local = LocalFiel.create(readFileSync(join(F, 'EKU9003173C9.cer')), readFileSync(join(F, 'EKU9003173C9.key')), '12345678a');

/** Simula cert-vault: material desde LocalFiel y firma real con la llave */
function fakeVault(opts: { token?: string; signCalls?: string[] } = {}): AxiosAdapter {
  return async (cfg) => {
    const ok = (data: unknown, status = 200) => ({ status, statusText: '', data, headers: {}, config: cfg });
    const headers = cfg.headers as Record<string, string>;
    if (headers['X-Service-Token'] !== (opts.token ?? 'secret-token-0123456789abcdef0123456789')) return ok({ message: 'Token inválido' }, 401);
    if (cfg.method === 'get') {
      return ok({
        rfc: local.rfc(),
        certificatePem: local.certificatePem(),
        certificateSerialDecimal: local.certificateSerial(),
        certificateIssuerName: local.certificateIssuerName(),
        validUntil: local.validTo().toISOString(),
        descargaMasivaAutorizada: true,
      });
    }
    const body = JSON.parse(cfg.data as string) as { data: string };
    opts.signCalls?.push(body.data);
    return ok({ signature: local.sign(Buffer.from(body.data, 'base64')).toString('base64') });
  };
}

const options = { baseUrl: 'https://cert-vault.internal', serviceToken: 'secret-token-0123456789abcdef0123456789' };

describe('VaultFiel', () => {
  it('carga el material y expone lo mismo que LocalFiel', async () => {
    const v = await VaultFiel.load(axios.create({ adapter: fakeVault() }), 'cuenta-1', options);
    expect(v.rfc()).toBe(local.rfc());
    expect(v.certificateSerial()).toBe(local.certificateSerial());
    expect(v.certificateIssuerName()).toBe(local.certificateIssuerName());
    expect(v.isValid(new Date('2025-01-01'))).toBe(true);
  });

  it('rechaza token de servicio incorrecto', async () => {
    await expect(VaultFiel.load(axios.create({ adapter: fakeVault() }), 'c', { ...options, serviceToken: 'x' }))
      .rejects.toBeInstanceOf(RequestBuilderError);
  });

  it('sign() sin prefirma lanza en vez de devolver vacío', async () => {
    const v = await VaultFiel.load(axios.create({ adapter: fakeVault() }), 'c', options);
    expect(() => v.sign('algo')).toThrow(RequestBuilderError);
  });
});

describe('AsyncRequestBuilder (firma remota) == FielRequestBuilder (firma local)', () => {
  const localBuilder = new FielRequestBuilder(local);

  async function remote(signCalls: string[] = []) {
    const v = await VaultFiel.load(axios.create({ adapter: fakeVault({ signCalls }) }), 'cuenta-1', options);
    return new AsyncRequestBuilder(v);
  }

  it('authorization idéntico con una sola firma remota', async () => {
    const calls: string[] = [];
    const r = await remote(calls);
    const created = new Date('2019-08-01T03:38:19.000Z');
    const expires = new Date('2019-08-01T03:43:19.000Z');
    const id = 'uuid-cf6c80fb-00ae-44c0-af56-54ec65decbaa-1';
    expect(await r.authorization(created, expires, id)).toBe(localBuilder.authorization(created, expires, id));
    expect(calls).toHaveLength(1);
  });

  it('query, verify y download idénticos', async () => {
    const r = await remote();
    const params = {
      serviceType: ServiceType.Cfdi,
      period: DateTimePeriod.createFromValues('2019-01-01T00:00:00', '2019-01-01T00:04:00'),
      downloadType: DownloadType.Issued,
      requestType: RequestType.Metadata,
      documentType: DocumentType.Undefined,
      complement: ComplementoCfdi.undefined(),
      documentStatus: DocumentStatus.Undefined,
      uuid: Uuid.empty(),
      rfcOnBehalf: RfcOnBehalf.empty(),
      rfcMatches: RfcMatches.empty(),
    };
    expect(await r.query(params)).toBe(localBuilder.query(params));
    expect(await r.verify('3f30a4e1-af73-4085-8991-e4d97eef16bd')).toBe(localBuilder.verify('3f30a4e1-af73-4085-8991-e4d97eef16bd'));
    expect(await r.download('4e80345d_01')).toBe(localBuilder.download('4e80345d_01'));
  });
});
