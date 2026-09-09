import { Request } from './request';
import { Response } from './response';

/**
 * Proxy del cliente HTTP.
 * Equivale a WebClient/WebClientInterface.php.
 *
 * call() NO debe invocar fireRequest/fireResponse: lo hace ServiceConsumer.
 * Token de inyección para Nest: WEB_CLIENT.
 */
export const WEB_CLIENT = Symbol('SAT_DESCARGA_WEB_CLIENT');

export interface WebClient {
  /** @throws WebClientException si hay error de red o HTTP */
  call(request: Request): Promise<Response>;
  /** Hook antes de la llamada (logging) */
  fireRequest(request: Request): void;
  /** Hook después de la llamada (logging) */
  fireResponse(response: Response): void;
}
