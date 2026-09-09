import { ServiceConsumer } from '../../internal/service-consumer';
import { RequestBuilder } from '../../request-builder/request-builder.interface';
import { ServiceEndpoints } from '../../shared/service-endpoints';
import { Token } from '../../shared/token';
import { WebClient } from '../../web-client/web-client.interface';
import { AuthenticateTranslator } from './authenticate-translator';

export const AUTHENTICATE_SOAP_ACTION = 'http://DescargaMasivaTerceros.gob.mx/IAutenticacion/Autentica';

/**
 * Paso 1 del flujo: autentica con la FIEL y obtiene el token.
 * Equivale a Service::authenticate() en Service.php.
 *
 * @throws SoapFaultError si la firma/certificado es inválido (a:InvalidSecurity)
 * @throws HttpServerError / WebClientException en errores de red o del SAT
 */
export async function authenticate(
  webClient: WebClient,
  requestBuilder: RequestBuilder,
  endpoints: ServiceEndpoints = ServiceEndpoints.cfdi(),
): Promise<Token> {
  const translator = new AuthenticateTranslator();
  const soapBody = translator.createSoapRequest(requestBuilder);
  const responseBody = await ServiceConsumer.consume(webClient, AUTHENTICATE_SOAP_ACTION, endpoints.authenticate, soapBody);
  return translator.createTokenFromSoapResponse(responseBody);
}
