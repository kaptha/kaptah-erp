import axios, { AxiosAdapter } from 'axios';
import { AxiosWebClient } from '../axios-web-client';
import { FakeWebClient } from '../fake-web-client';
import { Request } from '../request';
import { Response } from '../response';
import { HttpClientError, SoapFaultError, WebClientException } from '../web-client.errors';
import { SoapFaultInfo } from '../soap-fault-info';

describe('Request', () => {
  it('fusiona headers por defecto y descarta vacíos', () => {
    const r = new Request('POST', 'https://x', '<a/>', { SOAPAction: 'act', Authorization: '' });
    expect(r.headers['Content-type']).toContain('text/xml');
    expect(r.headers.SOAPAction).toBe('act');
    expect('Authorization' in r.headers).toBe(false);
  });

  it('toJSON omite el body y enmascara el token', () => {
    const r = new Request('POST', 'https://x', '<secreto/>', { Authorization: 'WRAP access_token="abc"' });
    const j = JSON.stringify(r);
    expect(j).not.toContain('secreto');
    expect(j).not.toContain('abc');
    expect(j).toContain('***');
  });
});

describe('Response', () => {
  it('clasifica códigos y detecta vacío', () => {
    expect(new Response(404, 'x').statusCodeIsClientError()).toBe(true);
    expect(new Response(503, 'x').statusCodeIsServerError()).toBe(true);
    expect(new Response(200, '').isEmpty()).toBe(true);
  });

  it('toJSON trunca bodies grandes', () => {
    const big = 'a'.repeat(5000);
    const j = new Response(200, big).toJSON();
    expect(j.body.length).toBeLessThan(2100);
    expect(j.bodyLength).toBe(5000);
  });
});

describe('errores', () => {
  const req = new Request('POST', 'https://x', '');
  const res = new Response(500, '');

  it('SoapFaultError es instancia de HttpClientError y WebClientException', () => {
    const e = new SoapFaultError(req, res, new SoapFaultInfo('a:Code', 'msg'));
    expect(e).toBeInstanceOf(HttpClientError);
    expect(e).toBeInstanceOf(WebClientException);
    expect(e).toBeInstanceOf(Error);
    expect(e.name).toBe('SoapFaultError');
    expect(e.message).toBe('Fault: a:Code - msg');
    expect(e.fault.code).toBe('a:Code');
  });
});

describe('AxiosWebClient', () => {
  function clientWith(adapter: AxiosAdapter) {
    return new AxiosWebClient(axios.create({ adapter }), { timeout: 100 });
  }

  it('devuelve Response con status y body aunque sea 500', async () => {
    const wc = clientWith(async (cfg: Parameters<AxiosAdapter>[0]) => ({ status: 500, statusText: 'x', data: '<fault/>', headers: { 'content-type': 'text/xml' }, config: cfg }));
    const res = await wc.call(new Request('POST', 'https://x', '<a/>'));
    expect(res.statusCode).toBe(500);
    expect(res.body).toBe('<fault/>');
    expect(res.headers['content-type']).toBe('text/xml');
  });

  it('convierte errores de red en WebClientException con Response 500 vacío', async () => {
    const wc = clientWith(async () => { throw new Error('ECONNRESET'); });
    await expect(wc.call(new Request('POST', 'https://x', ''))).rejects.toMatchObject({
      name: 'WebClientException',
      response: { statusCode: 500, body: '' },
    });
  });

  it('dispara los hooks', () => {
    const fired: string[] = [];
    const wc = new AxiosWebClient(axios.create(), {
      onFireRequest: () => fired.push('req'),
      onFireResponse: () => fired.push('res'),
    });
    wc.fireRequest(new Request('POST', 'https://x', ''));
    wc.fireResponse(new Response(200, 'ok'));
    expect(fired).toEqual(['req', 'res']);
  });
});

describe('FakeWebClient', () => {
  it('sirve respuestas en orden y falla al agotarse', async () => {
    const wc = new FakeWebClient(new Response(200, 'uno'), new Response(200, 'dos'));
    const req = new Request('POST', 'https://x', '');
    expect((await wc.call(req)).body).toBe('uno');
    expect((await wc.call(req)).body).toBe('dos');
    await expect(wc.call(req)).rejects.toBeInstanceOf(WebClientException);
    expect(wc.requests).toHaveLength(3);
  });
});
