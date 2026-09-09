import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import { ComplementoCfdi } from '../../shared/complemento-cfdi';
import { DateTimePeriod } from '../../shared/date-time-period';
import { DocumentStatus } from '../../shared/document-status';
import { DocumentType } from '../../shared/document-type';
import { DownloadType } from '../../shared/download-type';
import { RequestType } from '../../shared/request-type';
import { RfcMatch, RfcOnBehalf } from '../../shared/rfc-filter';
import { RfcMatches } from '../../shared/rfc-matches';
import { ServiceType } from '../../shared/service-type';
import { Uuid } from '../../shared/uuid';
import { LocalFiel } from '../fiel';
import { FielRequestBuilder, escapeXml } from '../fiel-request-builder';
import { QueryParametersView } from '../request-builder.interface';

const FILES = join(__dirname, '_files');
const file = (name: string) => readFileSync(join(FILES, name));
const text = (name: string) => file(name).toString('utf8');

/** Normaliza XML quitando espacios entre etiquetas y reserializando (como xmlFormat() en PHP) */
function normalize(xml: string): string {
  const doc = new DOMParser().parseFromString(xml.replace(/>\s+</g, '><').trim(), 'text/xml');
  return new XMLSerializer().serializeToString(doc).replace(/<\?xml[^>]*\?>/, '').replace(/><\/(\w+)>/g, '/>');
}

function createFiel(): LocalFiel {
  return LocalFiel.create(file('EKU9003173C9.cer'), file('EKU9003173C9.key'), text('EKU9003173C9-password.txt').trim());
}

function params(overrides: Partial<QueryParametersView> = {}): QueryParametersView {
  return {
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
    ...overrides,
  };
}

describe('LocalFiel', () => {
  const fiel = createFiel();

  it('lee RFC, serie decimal y emisor del certificado', () => {
    expect(fiel.rfc()).toBe('EKU9003173C9');
    expect(fiel.certificateSerial()).toBe('292233162870206001759766198462772978647764840757');
    expect(fiel.certificateIssuerName()).toBe(
      'CN=AC UAT,O=SERVICIO DE ADMINISTRACION TRIBUTARIA,OU=SAT-IES Authority,emailAddress=oscar.martinez@sat.gob.mx,street=3ra cerrada de caliz,postalCode=06370,C=MX,ST=CIUDAD DE MEXICO,L=COYOACAN,x500UniqueIdentifier=2.5.4.45,unstructuredName=responsable: ACDMA-SAT',
    );
  });

  it('es FIEL (sin OU) y respeta la vigencia', () => {
    expect(fiel.isFiel()).toBe(true);
    expect(fiel.isValid(new Date('2024-01-01'))).toBe(true);
    expect(fiel.isValid(new Date('2030-01-01'))).toBe(false);
  });

  it('rechaza contraseña incorrecta', () => {
    expect(() => LocalFiel.create(file('EKU9003173C9.cer'), file('EKU9003173C9.key'), 'mala')).toThrow();
  });

  it('acepta el certificado como base64 y como PEM', () => {
    const b64 = file('EKU9003173C9.cer').toString('base64');
    expect(LocalFiel.create(b64, file('EKU9003173C9.key'), '12345678a').rfc()).toBe('EKU9003173C9');
    expect(LocalFiel.create(fiel.certificatePem(), file('EKU9003173C9.key'), '12345678a').rfc()).toBe('EKU9003173C9');
  });
});

describe('FielRequestBuilder contra fixtures de phpcfdi', () => {
  const builder = new FielRequestBuilder(createFiel());

  it('authorization reproduce el XML esperado byte a byte (mismo token)', () => {
    const xml = builder.authorization(
      new Date('2019-08-01T03:38:19.000Z'),
      new Date('2019-08-01T03:43:19.000Z'),
      'uuid-cf6c80fb-00ae-44c0-af56-54ec65decbaa-1',
    );
    expect(normalize(xml)).toBe(normalize(text('authenticate-request.xml')));
  });

  it('authorization genera tokens distintos cuando no se pasa uno', () => {
    const a = builder.authorization(new Date(), new Date(Date.now() + 300_000));
    const b = builder.authorization(new Date(), new Date(Date.now() + 300_000));
    const id = (x: string) => /u:Id="(uuid-[^"]+)"/.exec(x)?.[1];
    expect(id(a)).toMatch(/^uuid-[0-9a-f-]{36}-1$/);
    expect(id(a)).not.toBe(id(b));
  });

  it('query emitidos (defaults) reproduce request-issued.xml', () => {
    expect(normalize(builder.query(params()))).toBe(normalize(text('request-issued.xml')));
  });

  it('query recibidos con todos los filtros reproduce request-received.xml', () => {
    const p = params({
      downloadType: DownloadType.Received,
      requestType: RequestType.Xml,
      documentType: DocumentType.Nomina,
      complement: ComplementoCfdi.create('nomina12'),
      documentStatus: DocumentStatus.Active,
      rfcOnBehalf: RfcOnBehalf.create('XXX01010199A'),
      rfcMatches: RfcMatches.create(RfcMatch.create('AAA010101AAA')),
    });
    expect(normalize(builder.query(p))).toBe(normalize(text('request-received.xml')));
  });

  it('query por folio reproduce request-item.xml', () => {
    const p = params({ uuid: Uuid.create('96623061-61fe-49de-b298-c7156476aa8b') });
    expect(normalize(builder.query(p))).toBe(normalize(text('request-item.xml')));
  });

  it('verify reproduce verify-request.xml', () => {
    expect(normalize(builder.verify('3f30a4e1-af73-4085-8991-e4d97eef16bd'))).toBe(normalize(text('verify-request.xml')));
  });

  it('download reproduce download-request.xml', () => {
    expect(normalize(builder.download('4e80345d-917f-40bb-a98f-4a73939343c5_01'))).toBe(normalize(text('download-request.xml')));
  });

  it('escapa valores en atributos', () => {
    expect(escapeXml('a<b>&"c\'')).toBe('a&lt;b&gt;&amp;&quot;c\'');
    expect(builder.verify('x"y')).toContain('IdSolicitud="x&quot;y"');
  });
});
