import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { FielRequestBuilder } from '../../../request-builder/fiel-request-builder';
import { LocalFiel } from '../../../request-builder/fiel';
import { CodeRequest } from '../../../shared/code-request';
import { ServiceEndpoints } from '../../../shared/service-endpoints';
import { Token } from '../../../shared/token';
import { FakeWebClient } from '../../../web-client/fake-web-client';
import { VERIFY_SOAP_ACTION, verify } from '../verify';
import { VerifyTranslator } from '../verify-translator';

const fx = (name: string) => readFileSync(join(__dirname, '_files', name), 'utf8');
const fielDir = join(__dirname, '..', '..', '..', 'request-builder', '__tests__', '_files');
const builder = () =>
  new FielRequestBuilder(
    LocalFiel.create(readFileSync(join(fielDir, 'EKU9003173C9.cer')), readFileSync(join(fielDir, 'EKU9003173C9.key')), '12345678a'),
  );
const token = new Token(new Date(), new Date(Date.now() + 300_000), 'TOK');

describe('CodeRequest', () => {
  it('mapea códigos conocidos y desconocidos', () => {
    expect(CodeRequest.fromValue(5000).isAccepted()).toBe(true);
    expect(CodeRequest.fromValue('5004').isEmptyResult()).toBe(true);
    expect(CodeRequest.fromValue(5005).isDuplicated()).toBe(true);
    expect(CodeRequest.fromValue(1).isUnknown()).toBe(true);
  });
});

describe('VerifyTranslator', () => {
  const t = new VerifyTranslator();

  it('solicitud terminada con 2 paquetes', () => {
    const r = t.createVerifyResultFromSoapResponse(fx('response-2-packages.xml'));
    expect(r.status.isAccepted()).toBe(true);
    expect(r.statusRequest.isFinished()).toBe(true);
    expect(r.codeRequest.isAccepted()).toBe(true);
    expect(r.numberCfdis).toBe(12345);
    expect(r.packagesIds).toEqual(['4e80345d-917f-40bb-a98f-4a73939343c5_01', '4e80345d-917f-40bb-a98f-4a73939343c5_02']);
    expect(r.countPackages()).toBe(2);
    expect(r.isReadyToDownload()).toBe(true);
    expect(r.isTerminal()).toBe(true);
  });

  it('solicitud rechazada por falta de información (5004)', () => {
    const r = t.createVerifyResultFromSoapResponse(fx('response-0-packages.xml'));
    expect(r.statusRequest.isRejected()).toBe(true);
    expect(r.codeRequest.isEmptyResult()).toBe(true);
    expect(r.numberCfdis).toBe(0);
    expect(r.packagesIds).toEqual([]);
    expect(r.isReadyToDownload()).toBe(false);
    expect(r.isTerminal()).toBe(true);
  });

  it('en proceso no es terminal', () => {
    const xml = fx('response-0-packages.xml').replace('EstadoSolicitud="5"', 'EstadoSolicitud="2"').replace('CodigoEstadoSolicitud="5004"', 'CodigoEstadoSolicitud="5000"');
    const r = t.createVerifyResultFromSoapResponse(xml);
    expect(r.statusRequest.isInProgress()).toBe(true);
    expect(r.isTerminal()).toBe(false);
  });

  it('serializa a JSON', () => {
    const j = JSON.parse(JSON.stringify(t.createVerifyResultFromSoapResponse(fx('response-2-packages.xml'))));
    expect(j.statusRequest).toEqual({ value: 3, name: 'Finished', message: 'Terminada' });
    expect(j.packagesIds).toHaveLength(2);
  });
});

describe('verify()', () => {
  it('envía al endpoint de verify con token e IdSolicitud firmado', async () => {
    const wc = FakeWebClient.withXml(fx('response-2-packages.xml'));
    const r = await verify(wc, builder(), token, '3f30a4e1-af73-4085-8991-e4d97eef16bd', ServiceEndpoints.cfdi());
    const req = wc.lastRequest()!;
    expect(req.uri).toBe(ServiceEndpoints.cfdi().verify);
    expect(req.headers.SOAPAction).toBe(VERIFY_SOAP_ACTION);
    expect(req.headers.Authorization).toBe('WRAP access_token="TOK"');
    expect(req.body).toContain('IdSolicitud="3f30a4e1-af73-4085-8991-e4d97eef16bd"');
    expect(r.countPackages()).toBe(2);
  });
});
