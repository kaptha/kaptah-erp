import { findAttributes, findContent, readXmlElement } from '../../internal/xml';
import { RequestBuilder } from '../../request-builder/request-builder.interface';
import { StatusCode } from '../../shared/status-code';
import { DownloadResult } from './download-result';

/**
 * Traduce entre el dominio y el SOAP de Descargar.
 * Equivale a Services/Download/DownloadTranslator.php.
 * Nota: el CodEstatus de esta operación viene en el HEADER (h:respuesta), no en el body.
 */
export class DownloadTranslator {
  createDownloadResultFromSoapResponse(content: string): DownloadResult {
    const env = readXmlElement(content);
    const v = findAttributes(env, 'header', 'respuesta');
    const code = parseInt(v.codestatus ?? '0', 10);
    const status = new StatusCode(Number.isNaN(code) ? 0 : code, v.mensaje ?? '');
    const packageB64 = findContent(env, 'body', 'RespuestaDescargaMasivaTercerosSalida', 'Paquete');
    return new DownloadResult(status, decodeBase64Strict(packageB64));
  }

  createSoapRequest(requestBuilder: RequestBuilder, packageId: string): string {
    return requestBuilder.download(packageId);
  }
}

/** Equivale a base64_decode($s, true) ?: '' — base64 inválido produce Buffer vacío */
function decodeBase64Strict(value: string): Buffer {
  const clean = value.replace(/\s/g, '');
  if (clean === '' || !/^[A-Za-z0-9+/]*={0,2}$/.test(clean) || clean.length % 4 !== 0) {
    return Buffer.alloc(0);
  }
  return Buffer.from(clean, 'base64');
}
