import { SoapFaultInfo } from '../web-client/soap-fault-info';
import { findElement, readXmlElement } from './xml';

/**
 * Extrae faultcode/faultstring de una respuesta SOAP, si los hay.
 * Equivale a Internal/SoapFaultInfoExtractor.php.
 * Un body que no es XML válido devuelve null (no lanza).
 */
export function extractSoapFault(source: string): SoapFaultInfo | null {
  let env;
  try {
    env = readXmlElement(source);
  } catch {
    return null;
  }
  const code = (findElement(env, 'body', 'fault', 'faultcode')?.textContent ?? '').trim();
  const message = (findElement(env, 'body', 'fault', 'faultstring')?.textContent ?? '').trim();
  if (code === '' && message === '') {
    return null;
  }
  return new SoapFaultInfo(code, message);
}
