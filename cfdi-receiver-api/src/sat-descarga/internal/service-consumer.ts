import { Token } from '../shared/token';
import { Request } from '../web-client/request';
import { Response } from '../web-client/response';
import { WebClient } from '../web-client/web-client.interface';
import {
  HttpClientError,
  HttpServerError,
  SoapFaultError,
  WebClientException,
} from '../web-client/web-client.errors';
import { extractSoapFault } from './soap-fault-info-extractor';

/**
 * Ejecuta una llamada SOAP al SAT y convierte respuestas anómalas en errores tipados.
 * Equivale a Internal/ServiceConsumer.php.
 *
 * Orden de evaluación: SOAP Fault → 4xx → 5xx → body vacío.
 */
export class ServiceConsumer {
  static consume(webClient: WebClient, soapAction: string, uri: string, body: string, token?: Token): Promise<string> {
    return new ServiceConsumer().execute(webClient, soapAction, uri, body, token);
  }

  async execute(webClient: WebClient, soapAction: string, uri: string, body: string, token?: Token): Promise<string> {
    const request = this.createRequest(uri, body, this.createHeaders(soapAction, token));
    let response: Response;
    let exception: WebClientException | undefined;
    try {
      response = await this.runRequest(webClient, request);
    } catch (error) {
      if (!(error instanceof WebClientException)) throw error;
      exception = error;
      response = error.response;
    }
    this.checkErrors(request, response, exception);
    return response.body;
  }

  createRequest(uri: string, body: string, headers: Record<string, string>): Request {
    return new Request('POST', uri, body, headers);
  }

  createHeaders(soapAction: string, token?: Token): Record<string, string> {
    const headers: Record<string, string> = { SOAPAction: soapAction };
    if (token) {
      headers.Authorization = `WRAP access_token="${token.value}"`;
    }
    return headers;
  }

  async runRequest(webClient: WebClient, request: Request): Promise<Response> {
    webClient.fireRequest(request);
    try {
      const response = await webClient.call(request);
      webClient.fireResponse(response);
      return response;
    } catch (error) {
      if (error instanceof WebClientException) {
        webClient.fireResponse(error.response);
      }
      throw error;
    }
  }

  checkErrors(request: Request, response: Response, cause?: unknown): void {
    const fault = extractSoapFault(response.body);
    if (fault) {
      throw new SoapFaultError(request, response, fault, cause);
    }
    if (response.statusCodeIsClientError()) {
      throw new HttpClientError(`Unexpected client error status code ${response.statusCode}`, request, response, cause);
    }
    if (response.statusCodeIsServerError()) {
      throw new HttpServerError(`Unexpected server error status code ${response.statusCode}`, request, response, cause);
    }
    if (response.isEmpty()) {
      throw new HttpServerError('Unexpected empty response from server', request, response, cause);
    }
  }
}
