import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { FielRequestBuilder } from '../../../request-builder/fiel-request-builder';
import { LocalFiel } from '../../../request-builder/fiel';
import { ComplementoCfdi } from '../../../shared/complemento-cfdi';
import { DateTimePeriod } from '../../../shared/date-time-period';
import { DocumentStatus } from '../../../shared/document-status';
import { DocumentType } from '../../../shared/document-type';
import { DownloadType } from '../../../shared/download-type';
import { RequestType } from '../../../shared/request-type';
import { RfcMatch } from '../../../shared/rfc-filter';
import { RfcMatches } from '../../../shared/rfc-matches';
import { ServiceEndpoints } from '../../../shared/service-endpoints';
import { ServiceType } from '../../../shared/service-type';
import { Token } from '../../../shared/token';
import { Uuid } from '../../../shared/uuid';
import { FakeWebClient } from '../../../web-client/fake-web-client';
import { QueryParameters } from '../query-parameters';
import { QueryTranslator } from '../query-translator';
import { QueryValidationError, query, querySoapAction } from '../query';

const fx = (name: string) => readFileSync(join(__dirname, '_files', name), 'utf8');
const fielDir = join(__dirname, '..', '..', '..', 'request-builder', '__tests__', '_files');
const builder = () =>
  new FielRequestBuilder(
    LocalFiel.create(readFileSync(join(fielDir, 'EKU9003173C9.cer')), readFileSync(join(fielDir, 'EKU9003173C9.key')), '12345678a'),
  );
const token = new Token(new Date(), new Date(Date.now() + 300_000), 'TOK');
const NOW = new Date('2026-09-11T12:00:00');
const jan2026 = () => DateTimePeriod.createFromValues('2026-01-01T00:00:00', '2026-01-31T23:59:59');

describe('QueryParameters', () => {
  it('defaults: emitidos, metadata, cfdi, sin filtros', () => {
    const p = QueryParameters.create();
    expect(p.downloadType).toBe(DownloadType.Issued);
    expect(p.requestType).toBe(RequestType.Metadata);
    expect(p.serviceType).toBe(ServiceType.Cfdi);
    expect(p.complement.isUndefined()).toBe(true);
    expect(p.uuid.isEmpty()).toBe(true);
    expect(p.rfcMatches.isEmpty()).toBe(true);
  });

  it('with*() es inmutable', () => {
    const a = QueryParameters.create().withPeriod(jan2026());
    const b = a.withDownloadType(DownloadType.Received).withRfcMatch(RfcMatch.create('XAXX010101000'));
    expect(a.downloadType).toBe(DownloadType.Issued);
    expect(b.downloadType).toBe(DownloadType.Received);
    expect(b.rfcMatch.value).toBe('XAXX010101000');
    expect(b.period).toBe(a.period);
  });

  it('serializa a JSON plano', () => {
    const j = QueryParameters.create().withPeriod(jan2026()).withComplement(ComplementoCfdi.create('nomina12')).toJSON();
    expect(j).toMatchObject({ complement: 'nomina12', period: { start: '2026-01-01T00:00:00' } });
  });
});

describe('QueryValidator', () => {
  const base = () => QueryParameters.create().withPeriod(jan2026());

  it('acepta una consulta válida', () => {
    expect(base().validate(NOW)).toEqual([]);
  });

  it('rechaza inicio >= fin', () => {
    const p = QueryParameters.create().withPeriod(DateTimePeriod.createFromValues('2026-01-01', '2026-01-01'));
    expect(p.validate(NOW)[0]).toContain('no puede ser mayor o igual');
  });

  it('rechaza más de 6 años atrás', () => {
    const p = QueryParameters.create().withPeriod(DateTimePeriod.createFromValues('2019-01-01', '2019-01-31'));
    expect(p.validate(NOW).some((e) => e.includes('6 años'))).toBe(true);
    const ok = QueryParameters.create().withPeriod(DateTimePeriod.createFromValues('2020-09-11', '2020-09-30'));
    expect(ok.validate(NOW)).toEqual([]);
  });

  it('XML recibidos exige EstadoComprobante=Vigente', () => {
    const p = base().withDownloadType(DownloadType.Received).withRequestType(RequestType.Xml);
    expect(p.validate(NOW)[0]).toContain('Cancelados');
    expect(p.withDocumentStatus(DocumentStatus.Active).validate(NOW)).toEqual([]);
  });

  it('recibidos admite máximo 1 emisor; emitidos máximo 5 receptores', () => {
    const two = RfcMatches.createFromValues('AAA010101AAA', 'BBB010101BBB');
    expect(base().withDownloadType(DownloadType.Received).withRfcMatches(two).validate(NOW)[0]).toContain('más de 1 RFC emisor');
    const six = RfcMatches.createFromValues('AAA010101AAA', 'BBB010101BBB', 'CCC010101CCC', 'DDD010101DDD', 'EEE010101EEE', 'FFF010101FFF');
    expect(base().withRfcMatches(six).validate(NOW)[0]).toContain('más de 5 RFC receptores');
    const five = RfcMatches.createFromValues('AAA010101AAA', 'BBB010101BBB', 'CCC010101CCC', 'DDD010101DDD', 'EEE010101EEE');
    expect(base().withRfcMatches(five).validate(NOW)).toEqual([]);
  });

  it('retenciones no admite complemento (aún no portado)', () => {
    const p = base().withServiceType(ServiceType.Retenciones).withComplement(ComplementoCfdi.create('nomina12'));
    expect(p.validate(NOW)[0]).toContain('Retenciones');
  });

  it('consulta por UUID no admite otros filtros', () => {
    const p = QueryParameters.create()
      .withUuid(Uuid.create('96623061-61fe-49de-b298-c7156476aa8b'))
      .withRfcMatch(RfcMatch.create('AAA010101AAA'))
      .withDocumentType(DocumentType.Ingreso)
      .withDocumentStatus(DocumentStatus.Active)
      .withComplement(ComplementoCfdi.create('spei'));
    expect(p.validate(NOW)).toHaveLength(4);
    expect(QueryParameters.create().withUuid(Uuid.create('96623061-61fe-49de-b298-c7156476aa8b')).validate(NOW)).toEqual([]);
  });
});

describe('QueryTranslator', () => {
  const t = new QueryTranslator();

  it.each(['response-issued.xml', 'response-received.xml', 'response-item.xml'])('lee %s', (file) => {
    const r = t.createQueryResultFromSoapResponse(fx(file));
    expect(r.status.code).toBe(5000);
    expect(r.status.message).toBe('Solicitud Aceptada');
    expect(r.requestId).toBe('d49af78d-1c80-4221-a48d-345ace91626b');
    expect(r.isAccepted()).toBe(true);
  });

  it('respuesta sin nodo conocido → status 0 y sin id', () => {
    const r = t.createQueryResultFromSoapResponse('<s:Envelope xmlns:s="x"><s:Body/></s:Envelope>');
    expect(r.status.code).toBe(0);
    expect(r.isAccepted()).toBe(false);
  });
});

describe('query()', () => {
  it('resuelve SOAPAction por tipo de consulta', () => {
    const p = QueryParameters.create().withPeriod(jan2026());
    expect(querySoapAction(p)).toMatch(/SolicitaDescargaEmitidos$/);
    expect(querySoapAction(p.withDownloadType(DownloadType.Received))).toMatch(/SolicitaDescargaRecibidos$/);
    expect(querySoapAction(p.withUuid(Uuid.create('96623061-61fe-49de-b298-c7156476aa8b')))).toMatch(/SolicitaDescargaFolio$/);
  });

  it('envía al endpoint de query con token y devuelve el IdSolicitud', async () => {
    const wc = FakeWebClient.withXml(fx('response-received.xml'));
    const p = QueryParameters.create().withPeriod(jan2026()).withDownloadType(DownloadType.Received);
    const r = await query(wc, builder(), token, p, ServiceEndpoints.cfdi());
    const req = wc.lastRequest()!;
    expect(req.uri).toBe(ServiceEndpoints.cfdi().query);
    expect(req.headers.Authorization).toBe('WRAP access_token="TOK"');
    expect(req.headers.SOAPAction).toMatch(/SolicitaDescargaRecibidos$/);
    expect(req.body).toContain('<des:SolicitaDescargaRecibidos>');
    expect(r.requestId).toBe('d49af78d-1c80-4221-a48d-345ace91626b');
  });

  it('no llama al SAT si la validación falla', async () => {
    const wc = FakeWebClient.withXml(fx('response-issued.xml'));
    const p = QueryParameters.create().withPeriod(jan2026()).withDownloadType(DownloadType.Received).withRequestType(RequestType.Xml);
    await expect(query(wc, builder(), token, p)).rejects.toBeInstanceOf(QueryValidationError);
    expect(wc.requests).toHaveLength(0);
  });
});
