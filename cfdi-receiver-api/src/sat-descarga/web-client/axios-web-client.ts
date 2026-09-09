import type { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios';
import { Request } from './request';
import { Response } from './response';
import { WebClient } from './web-client.interface';
import { WebClientException } from './web-client.errors';

export type RequestHook = (request: Request) => void;
export type ResponseHook = (response: Response) => void;

export interface AxiosWebClientOptions {
  /** Milisegundos; default 60 000. Para Download conviene subirlo. */
  timeout?: number;
  onFireRequest?: RequestHook;
  onFireResponse?: ResponseHook;
}

/**
 * Implementación de WebClient sobre axios.
 * Equivale a WebClient/GuzzleWebClient.php.
 *
 * Recibe un AxiosInstance (p. ej. HttpService.axiosRef) para no depender de Nest.
 * validateStatus siempre true: el SAT responde 500 con un SOAP Fault en el body
 * y ServiceConsumer necesita leerlo.
 */
export class AxiosWebClient implements WebClient {
  private readonly timeout: number;
  private readonly onFireRequest?: RequestHook;
  private readonly onFireResponse?: ResponseHook;

  constructor(
    private readonly axios: AxiosInstance,
    options: AxiosWebClientOptions = {},
  ) {
    this.timeout = options.timeout ?? 60_000;
    this.onFireRequest = options.onFireRequest;
    this.onFireResponse = options.onFireResponse;
  }

  fireRequest(request: Request): void {
    this.onFireRequest?.(request);
  }

  fireResponse(response: Response): void {
    this.onFireResponse?.(response);
  }

  async call(request: Request): Promise<Response> {
    const config: AxiosRequestConfig = {
      method: request.method,
      url: request.uri,
      data: request.body,
      headers: request.headers,
      timeout: this.timeout,
      responseType: 'text',
      transformResponse: (r) => r, // no intentar parsear JSON
      validateStatus: () => true,
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    };

    try {
      const res = await this.axios.request<string>(config);
      return this.toResponse(res.status, res.data, res.headers);
    } catch (error) {
      const axiosError = error as AxiosError<string>;
      const response = axiosError.response
        ? this.toResponse(axiosError.response.status, axiosError.response.data, axiosError.response.headers)
        : new Response(500, '', {});
      throw new WebClientException(`Error connecting to ${request.uri}`, request, response, error);
    }
  }

  private toResponse(status: number, data: unknown, rawHeaders: unknown): Response {
    const body = typeof data === 'string' ? data : data == null ? '' : String(data);
    const headers: Record<string, string> = {};
    if (rawHeaders && typeof rawHeaders === 'object') {
      for (const [k, v] of Object.entries(rawHeaders as Record<string, unknown>)) {
        if (v != null) headers[k] = Array.isArray(v) ? v.join(', ') : String(v);
      }
    }
    return new Response(status, body, headers);
  }
}
