import { Request } from './request';
import { Response } from './response';
import { SoapFaultInfo } from './soap-fault-info';

/**
 * Jerarquía de errores del transporte.
 * Equivale a WebClient/Exceptions/*.php.
 *
 *   WebClientException          (request + response + cause)
 *   ├─ HttpClientError          4xx — no reintentar
 *   │  └─ SoapFaultError        fault SOAP: petición inválida — no reintentar
 *   └─ HttpServerError          5xx / respuesta vacía — reintentable
 */
export class WebClientException extends Error {
  constructor(
    message: string,
    readonly request: Request,
    readonly response: Response,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  toJSON(): { name: string; message: string; request: unknown; response: unknown } {
    return { name: this.name, message: this.message, request: this.request.toJSON(), response: this.response.toJSON() };
  }
}

export class HttpClientError extends WebClientException {}

export class HttpServerError extends WebClientException {}

export class SoapFaultError extends HttpClientError {
  constructor(
    request: Request,
    response: Response,
    readonly fault: SoapFaultInfo,
    cause?: unknown,
  ) {
    super(`Fault: ${fault.code} - ${fault.message}`, request, response, cause);
  }
}
