import { findAttributes, findContents, readXmlElement } from '../../internal/xml';
import { RequestBuilder } from '../../request-builder/request-builder.interface';
import { CodeRequest } from '../../shared/code-request';
import { StatusCode } from '../../shared/status-code';
import { StatusRequest } from '../../shared/status-request';
import { VerifyResult } from './verify-result';

const RESULT_PATH = ['body', 'VerificaSolicitudDescargaResponse', 'VerificaSolicitudDescargaResult'];

/**
 * Traduce entre el dominio y el SOAP de VerificaSolicitudDescarga.
 * Equivale a Services/Verify/VerifyTranslator.php.
 */
export class VerifyTranslator {
  createVerifyResultFromSoapResponse(content: string): VerifyResult {
    const env = readXmlElement(content);
    const v = findAttributes(env, ...RESULT_PATH);
    const status = new StatusCode(toInt(v.codestatus), v.mensaje ?? '');
    const statusRequest = StatusRequest.fromValue(toInt(v.estadosolicitud));
    const codeRequest = CodeRequest.fromValue(toInt(v.codigoestadosolicitud));
    const numberCfdis = toInt(v.numerocfdis);
    const packages = findContents(env, ...RESULT_PATH, 'IdsPaquetes').filter((p) => p !== '');
    return new VerifyResult(status, statusRequest, codeRequest, numberCfdis, ...packages);
  }

  createSoapRequest(requestBuilder: RequestBuilder, requestId: string): string {
    return requestBuilder.verify(requestId);
  }
}

function toInt(value: string | undefined): number {
  const n = parseInt(value ?? '0', 10);
  return Number.isNaN(n) ? 0 : n;
}
