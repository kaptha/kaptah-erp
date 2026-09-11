import { ServiceConsumer } from '../../internal/service-consumer';
import { RequestBuilder } from '../../request-builder/request-builder.interface';
import { ServiceEndpoints } from '../../shared/service-endpoints';
import { Token } from '../../shared/token';
import { WebClient } from '../../web-client/web-client.interface';
import { VerifyResult } from './verify-result';
import { VerifyTranslator } from './verify-translator';

export const VERIFY_SOAP_ACTION =
  'http://DescargaMasivaTerceros.sat.gob.mx/IVerificaSolicitudDescargaService/VerificaSolicitudDescarga';

/**
 * Paso 3 del flujo: consulta el estado de una solicitud.
 * Equivale a Service::verify() en Service.php.
 * Se llama en polling hasta que result.isTerminal().
 */
export async function verify(
  webClient: WebClient,
  requestBuilder: RequestBuilder,
  token: Token,
  requestId: string,
  endpoints: ServiceEndpoints = ServiceEndpoints.cfdi(),
): Promise<VerifyResult> {
  const translator = new VerifyTranslator();
  const soapBody = translator.createSoapRequest(requestBuilder, requestId);
  const responseBody = await ServiceConsumer.consume(webClient, VERIFY_SOAP_ACTION, endpoints.verify, soapBody, token);
  return translator.createVerifyResultFromSoapResponse(responseBody);
}
