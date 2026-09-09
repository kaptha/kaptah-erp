import { Token } from '../../shared/token';
import { FakeWebClient } from '../../web-client/fake-web-client';
import { Request } from '../../web-client/request';
import { Response } from '../../web-client/response';
import { HttpClientError, HttpServerError, SoapFaultError, WebClientException } from '../../web-client/web-client.errors';
import { cleanPemContents, nospaces } from '../helpers';
import { ServiceConsumer } from '../service-consumer';
import { extractSoapFault } from '../soap-fault-info-extractor';
import { findAttributes, findContent, findContents, findElement, readXmlElement } from '../xml';

const FAULT_XML = `<?xml version="1.0"?>
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">
  <s:Body>
    <s:Fault>
      <faultcode>a:InvalidSecurity</faultcode>
      <faultstring xml:lang="es-MX">An error occurred when verifying security for the message.</faultstring>
    </s:Fault>
  </s:Body>
</s:Envelope>`;

const OK_XML = `<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"><s:Body>
  <VerificaSolicitudDescargaResponse xmlns="http://DescargaMasivaTerceros.sat.gob.mx">
    <VerificaSolicitudDescargaResult CodEstatus="5000" EstadoSolicitud="3" Mensaje="Solicitud Aceptada" NumeroCFDIs="12">
      <IdsPaquetes>AAA-1</IdsPaquetes>
      <IdsPaquetes>AAA-2</IdsPaquetes>
    </VerificaSolicitudDescargaResult>
  </VerificaSolicitudDescargaResponse>
</s:Body></s:Envelope>`;

describe('helpers', () => {
  it('nospaces compacta templates', () => {
    const input = `<?xml version="1.0"?>\n  <a>\n    <b>x</b>\n  </a>\n`;
    expect(nospaces(input)).toBe('<?xml version="1.0"?>\n<a><b>x</b></a>');
  });

  it('cleanPemContents deja solo el base64', () => {
    const pem = '-----BEGIN CERTIFICATE-----\nAAAA\n BBBB \n-----END CERTIFICATE-----\n';
    expect(cleanPemContents(pem)).toBe('AAAABBBB');
  });
});

describe('xml', () => {
  const env = readXmlElement(OK_XML);

  it('findElement ignora prefijos y mayúsculas', () => {
    expect(findElement(env, 'BODY', 'verificasolicituddescargaresponse')).not.toBeNull();
    expect(findElement(env, 'body', 'noexiste')).toBeNull();
  });

  it('findAttributes devuelve nombres en minúsculas', () => {
    const a = findAttributes(env, 'body', 'VerificaSolicitudDescargaResponse', 'VerificaSolicitudDescargaResult');
    expect(a.estadosolicitud).toBe('3');
    expect(a.numerocfdis).toBe('12');
  });

  it('findContents lista hijos repetidos', () => {
    expect(findContents(env, 'body', 'VerificaSolicitudDescargaResponse', 'VerificaSolicitudDescargaResult', 'IdsPaquetes'))
      .toEqual(['AAA-1', 'AAA-2']);
    expect(findContent(env, 'body', 'nada')).toBe('');
  });

  it('rechaza XML vacío', () => {
    expect(() => readXmlElement('')).toThrow();
  });
});

describe('extractSoapFault', () => {
  it('extrae code y message', () => {
    const f = extractSoapFault(FAULT_XML);
    expect(f?.code).toBe('a:InvalidSecurity');
    expect(f?.message).toContain('verifying security');
  });

  it('devuelve null sin fault, con HTML o vacío', () => {
    expect(extractSoapFault(OK_XML)).toBeNull();
    expect(extractSoapFault('<html><body>Service Unavailable</body></html>')).toBeNull();
    expect(extractSoapFault('')).toBeNull();
    expect(extractSoapFault('no es xml <<<')).toBeNull();
  });
});

describe('ServiceConsumer', () => {
  const token = new Token(new Date(), new Date(Date.now() + 300_000), 'TOK');

  it('arma headers SOAPAction y Authorization WRAP', async () => {
    const wc = FakeWebClient.withXml(OK_XML);
    await ServiceConsumer.consume(wc, 'http://sat/Action', 'https://sat/svc', '<b/>', token);
    const req = wc.lastRequest()!;
    expect(req.method).toBe('POST');
    expect(req.headers.SOAPAction).toBe('http://sat/Action');
    expect(req.headers.Authorization).toBe('WRAP access_token="TOK"');
  });

  it('omite Authorization sin token (Authenticate)', async () => {
    const wc = FakeWebClient.withXml(OK_XML);
    await ServiceConsumer.consume(wc, 'a', 'https://x', '<b/>');
    expect('Authorization' in wc.lastRequest()!.headers).toBe(false);
  });

  it('dispara fireRequest/fireResponse alrededor de la llamada', async () => {
    const wc = FakeWebClient.withXml(OK_XML);
    await ServiceConsumer.consume(wc, 'a', 'https://x', '<b/>');
    expect(wc.firedRequests).toHaveLength(1);
    expect(wc.firedResponses).toHaveLength(1);
  });

  it('un 500 con SOAP Fault lanza SoapFaultError (no HttpServerError)', async () => {
    const wc = new FakeWebClient(new Response(500, FAULT_XML));
    const p = ServiceConsumer.consume(wc, 'a', 'https://x', '<b/>');
    await expect(p).rejects.toBeInstanceOf(SoapFaultError);
    await expect(p).rejects.not.toBeInstanceOf(HttpServerError);
  });

  it('4xx sin fault → HttpClientError; 5xx sin fault → HttpServerError', async () => {
    await expect(ServiceConsumer.consume(new FakeWebClient(new Response(401, 'no')), 'a', 'https://x', ''))
      .rejects.toBeInstanceOf(HttpClientError);
    await expect(ServiceConsumer.consume(new FakeWebClient(new Response(503, '<html/>')), 'a', 'https://x', ''))
      .rejects.toBeInstanceOf(HttpServerError);
  });

  it('respuesta 200 vacía → HttpServerError', async () => {
    await expect(ServiceConsumer.consume(new FakeWebClient(new Response(200, '')), 'a', 'https://x', ''))
      .rejects.toMatchObject({ name: 'HttpServerError', message: expect.stringContaining('empty') });
  });

  it('error de red conserva la causa y dispara fireResponse', async () => {
    const req = new Request('POST', 'https://x', '');
    const netErr = new WebClientException('Error connecting', req, new Response(500, ''), new Error('ETIMEDOUT'));
    const wc = new FakeWebClient(netErr);
    await expect(ServiceConsumer.consume(wc, 'a', 'https://x', '')).rejects.toMatchObject({
      name: 'HttpServerError',
      cause: netErr,
    });
    expect(wc.firedResponses).toHaveLength(1);
  });
});
