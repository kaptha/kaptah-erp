import { Request } from './request';
import { Response } from './response';
import { WebClient } from './web-client.interface';
import { WebClientException } from './web-client.errors';

/**
 * WebClient para pruebas: devuelve respuestas precargadas en orden
 * y registra las peticiones recibidas. No toca la red.
 */
export class FakeWebClient implements WebClient {
  readonly requests: Request[] = [];
  readonly firedRequests: Request[] = [];
  readonly firedResponses: Response[] = [];
  private readonly queue: Array<Response | Error>;

  constructor(...responses: Array<Response | Error>) {
    this.queue = [...responses];
  }

  /** Encola una respuesta exitosa con el XML dado */
  static withXml(xml: string, statusCode = 200): FakeWebClient {
    return new FakeWebClient(new Response(statusCode, xml));
  }

  fireRequest(request: Request): void {
    this.firedRequests.push(request);
  }

  fireResponse(response: Response): void {
    this.firedResponses.push(response);
  }

  async call(request: Request): Promise<Response> {
    this.requests.push(request);
    const next = this.queue.shift();
    if (next === undefined) {
      throw new WebClientException('FakeWebClient: no hay más respuestas encoladas', request, new Response(500, ''));
    }
    if (next instanceof Error) {
      throw next;
    }
    return next;
  }

  lastRequest(): Request | undefined {
    return this.requests[this.requests.length - 1];
  }
}
