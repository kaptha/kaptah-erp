import { ServiceConsumer } from '../../internal/service-consumer';
import { RequestBuilder } from '../../request-builder/request-builder.interface';
import { ServiceEndpoints } from '../../shared/service-endpoints';
import { Token } from '../../shared/token';
import { WebClient } from '../../web-client/web-client.interface';
import { QueryParameters } from './query-parameters';
import { QueryResult } from './query-result';
import { QueryTranslator } from './query-translator';

const NS = 'http://DescargaMasivaTerceros.sat.gob.mx';

/** SOAPAction según el tipo de consulta (emitidos, recibidos o por folio) */
export function querySoapAction(parameters: QueryParameters): string {
  if (!parameters.uuid.isEmpty()) {
    return `${NS}/ISolicitaDescargaService/SolicitaDescargaFolio`;
  }
  return parameters.downloadType === 'RfcEmisor'
    ? `${NS}/ISolicitaDescargaService/SolicitaDescargaEmitidos`
    : `${NS}/ISolicitaDescargaService/SolicitaDescargaRecibidos`;
}

export class QueryValidationError extends Error {
  constructor(readonly errors: string[]) {
    super(`Parámetros de consulta inválidos: ${errors.join(' ')}`);
    this.name = 'QueryValidationError';
    Object.setPrototypeOf(this, QueryValidationError.prototype);
  }
}

/**
 * Paso 2 del flujo: presenta la solicitud de descarga y obtiene el IdSolicitud.
 * Equivale a Service::query() en Service.php.
 *
 * @throws QueryValidationError si los parámetros violan reglas del SAT (no se hace la llamada)
 * @throws SoapFaultError / HttpServerError / WebClientException
 */
export async function query(
  webClient: WebClient,
  requestBuilder: RequestBuilder,
  token: Token,
  parameters: QueryParameters,
  endpoints: ServiceEndpoints = ServiceEndpoints.cfdi(),
): Promise<QueryResult> {
  const errors = parameters.validate();
  if (errors.length > 0) {
    throw new QueryValidationError(errors);
  }
  const translator = new QueryTranslator();
  const soapBody = translator.createSoapRequest(requestBuilder, parameters);
  const responseBody = await ServiceConsumer.consume(webClient, querySoapAction(parameters), endpoints.query, soapBody, token);
  return translator.createQueryResultFromSoapResponse(responseBody);
}
