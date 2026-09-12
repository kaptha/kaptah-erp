import { ServiceConsumer } from '../../internal/service-consumer';
import { RequestBuilder } from '../../request-builder/request-builder.interface';
import { ServiceEndpoints } from '../../shared/service-endpoints';
import { Token } from '../../shared/token';
import { WebClient } from '../../web-client/web-client.interface';
import { DownloadResult } from './download-result';
import { DownloadTranslator } from './download-translator';

export const DOWNLOAD_SOAP_ACTION =
  'http://DescargaMasivaTerceros.sat.gob.mx/IDescargaMasivaTercerosService/Descargar';

/**
 * Paso 4 del flujo: descarga un paquete (ZIP) por su IdPaquete.
 * Equivale a Service::download() en Service.php.
 * Los paquetes pueden pesar cientos de MB: usa un WebClient con timeout amplio.
 */
export async function download(
  webClient: WebClient,
  requestBuilder: RequestBuilder,
  token: Token,
  packageId: string,
  endpoints: ServiceEndpoints = ServiceEndpoints.cfdi(),
): Promise<DownloadResult> {
  const translator = new DownloadTranslator();
  const soapBody = translator.createSoapRequest(requestBuilder, packageId);
  const responseBody = await ServiceConsumer.consume(webClient, DOWNLOAD_SOAP_ACTION, endpoints.download, soapBody, token);
  return translator.createDownloadResultFromSoapResponse(responseBody);
}
