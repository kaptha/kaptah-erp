import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { FielRequestBuilder } from '../../../request-builder/fiel-request-builder';
import { LocalFiel } from '../../../request-builder/fiel';
import { ServiceEndpoints } from '../../../shared/service-endpoints';
import { Token } from '../../../shared/token';
import { FakeWebClient } from '../../../web-client/fake-web-client';
import { Response } from '../../../web-client/response';
import { SoapFaultError } from '../../../web-client/web-client.errors';
import { AUTHENTICATE_SOAP_ACTION, authenticate } from '../authenticate';
import { AuthenticateTranslator } from '../authenticate-translator';
import { InMemoryTokenCache, obtainToken } from '../token-cache';

const fx = (name: string) => readFileSync(join(__dirname, '_files', name), 'utf8');
const fielDir = join(__dirname, '..', '..', '..', 'request-builder', '__tests__', '_files');
const builder = () =>
  new FielRequestBuilder(
    LocalFiel.create(readFileSync(join(fielDir, 'EKU9003173C9.cer')), readFileSync(join(fielDir, 'EKU9003173C9.key')), '12345678a'),
  );

describe('AuthenticateTranslator', () => {
  const translator = new AuthenticateTranslator();

  it('extrae token y fechas de la respuesta', () => {
    const token = translator.createTokenFromSoapResponse(fx('response-with-token.xml'));
    expect(token.value.startsWith('eyJhbGciOi')).toBe(true);
    expect(token.created.toISOString()).toBe('2019-08-01T03:38:20.044Z');
    expect(token.expires.toISOString()).toBe('2019-08-01T03:43:20.044Z');
    expect(token.isValid(0, new Date('2019-08-01T03:40:00Z'))).toBe(true);
    expect(token.isValid(0, new Date())).toBe(false);
  });

  it('crea el request con vigencia de 5 minutos', () => {
    const now = new Date('2026-09-09T10:00:00.000Z');
    const xml = translator.createSoapRequest(builder(), now);
    expect(xml).toContain('<u:Created>2026-09-09T10:00:00.000Z</u:Created>');
    expect(xml).toContain('<u:Expires>2026-09-09T10:05:00.000Z</u:Expires>');
    expect(xml).toContain('<Autentica xmlns="http://DescargaMasivaTerceros.gob.mx"/>');
  });
});

describe('authenticate()', () => {
  it('llama al endpoint correcto sin Authorization y devuelve el token', async () => {
    const wc = FakeWebClient.withXml(fx('response-with-token.xml'));
    const token = await authenticate(wc, builder(), ServiceEndpoints.cfdi());
    const req = wc.lastRequest()!;
    expect(req.uri).toBe(ServiceEndpoints.cfdi().authenticate);
    expect(req.headers.SOAPAction).toBe(AUTHENTICATE_SOAP_ACTION);
    expect('Authorization' in req.headers).toBe(false);
    expect(req.body).toContain('<o:BinarySecurityToken');
    expect(token.isValueEmpty()).toBe(false);
  });

  it('convierte a:InvalidSecurity en SoapFaultError', async () => {
    const wc = new FakeWebClient(new Response(500, fx('response-with-error.xml')));
    await expect(authenticate(wc, builder())).rejects.toMatchObject({
      name: 'SoapFaultError',
      fault: { code: 'a:InvalidSecurity' },
    });
    await expect(authenticate(new FakeWebClient(new Response(500, fx('response-with-error.xml'))), builder()))
      .rejects.toBeInstanceOf(SoapFaultError);
  });
});

describe('obtainToken()', () => {
  const now = new Date('2026-09-09T10:00:00Z');
  const fresh = () => new Token(now, new Date(now.getTime() + 300_000), 'FRESH');

  it('autentica y cachea cuando no hay token', async () => {
    const cache = new InMemoryTokenCache();
    const auth = jest.fn().mockResolvedValue(fresh());
    const t = await obtainToken(cache, 'k', auth, now);
    expect(t.value).toBe('FRESH');
    expect(auth).toHaveBeenCalledTimes(1);
    expect((await cache.get('k'))?.value).toBe('FRESH');
  });

  it('reutiliza el token cacheado mientras sea válido', async () => {
    const cache = new InMemoryTokenCache();
    await cache.set('k', fresh(), 300);
    const auth = jest.fn();
    const t = await obtainToken(cache, 'k', auth, now);
    expect(t.value).toBe('FRESH');
    expect(auth).not.toHaveBeenCalled();
  });

  it('re-autentica si al token le queda menos del margen de seguridad', async () => {
    const cache = new InMemoryTokenCache();
    await cache.set('k', new Token(now, new Date(now.getTime() + 30_000), 'OLD'), 300);
    const auth = jest.fn().mockResolvedValue(fresh());
    const t = await obtainToken(cache, 'k', auth, now);
    expect(t.value).toBe('FRESH');
    expect(auth).toHaveBeenCalledTimes(1);
  });

  it('no cachea un token que ya nace inválido', async () => {
    const cache = new InMemoryTokenCache();
    const auth = jest.fn().mockResolvedValue(Token.empty());
    await obtainToken(cache, 'k', auth, now);
    expect(await cache.get('k')).toBeNull();
  });
});
