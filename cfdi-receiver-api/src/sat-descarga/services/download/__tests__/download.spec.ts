import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { FielRequestBuilder } from '../../../request-builder/fiel-request-builder';
import { LocalFiel } from '../../../request-builder/fiel';
import { ServiceEndpoints } from '../../../shared/service-endpoints';
import { Token } from '../../../shared/token';
import { FakeWebClient } from '../../../web-client/fake-web-client';
import { DOWNLOAD_SOAP_ACTION, download } from '../download';
import { DownloadTranslator } from '../download-translator';

const fx = (name: string) => readFileSync(join(__dirname, '_files', name), 'utf8');
const fielDir = join(__dirname, '..', '..', '..', 'request-builder', '__tests__', '_files');
const builder = () =>
  new FielRequestBuilder(
    LocalFiel.create(readFileSync(join(fielDir, 'EKU9003173C9.cer')), readFileSync(join(fielDir, 'EKU9003173C9.key')), '12345678a'),
  );
const token = new Token(new Date(), new Date(Date.now() + 300_000), 'TOK');

describe('DownloadTranslator', () => {
  const t = new DownloadTranslator();

  it('lee el estado del header y decodifica el ZIP', () => {
    const r = t.createDownloadResultFromSoapResponse(fx('response-with-package.xml'));
    expect(r.status.isAccepted()).toBe(true);
    expect(r.status.message).toBe('Solicitud Aceptada');
    expect(r.packageSize).toBeGreaterThan(1000);
    expect(r.isZip()).toBe(true);
    expect(r.packageContent.length).toBe(r.packageSize);
  });

  it('base64 inválido o vacío produce paquete vacío', () => {
    const empty = '<s:Envelope xmlns:s="x"><s:Header><h:respuesta CodEstatus="5004" Mensaje="No hay" xmlns:h="y"/></s:Header><s:Body><R><Paquete></Paquete></R></s:Body></s:Envelope>';
    const r = t.createDownloadResultFromSoapResponse(empty);
    expect(r.status.code).toBe(5004);
    expect(r.packageSize).toBe(0);
    expect(r.isZip()).toBe(false);
    const bad = empty.replace('<Paquete></Paquete>', '<Paquete>%%no-base64%%</Paquete>').replace('<R>', '<RespuestaDescargaMasivaTercerosSalida>').replace('</R>', '</RespuestaDescargaMasivaTercerosSalida>');
    expect(t.createDownloadResultFromSoapResponse(bad).packageSize).toBe(0);
  });

  it('el JSON no expone el contenido', () => {
    const j = JSON.stringify(t.createDownloadResultFromSoapResponse(fx('response-with-package.xml')));
    expect(j).not.toContain('UEsDB');
    expect(JSON.parse(j)).toHaveProperty('size');
  });
});

describe('download()', () => {
  it('envía al endpoint de descarga con token e IdPaquete firmado', async () => {
    const wc = FakeWebClient.withXml(fx('response-with-package.xml'));
    const r = await download(wc, builder(), token, '4e80345d-917f-40bb-a98f-4a73939343c5_01', ServiceEndpoints.cfdi());
    const req = wc.lastRequest()!;
    expect(req.uri).toBe(ServiceEndpoints.cfdi().download);
    expect(req.headers.SOAPAction).toBe(DOWNLOAD_SOAP_ACTION);
    expect(req.headers.Authorization).toBe('WRAP access_token="TOK"');
    expect(req.body).toContain('IdPaquete="4e80345d-917f-40bb-a98f-4a73939343c5_01"');
    expect(r.isZip()).toBe(true);
  });
});
