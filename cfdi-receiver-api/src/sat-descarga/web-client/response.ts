import { Headers } from './request';

/**
 * Representación mínima de una respuesta HTTP del SAT.
 * Equivale a WebClient/Response.php.
 */
export class Response {
  constructor(
    readonly statusCode: number,
    readonly body: string,
    readonly headers: Headers = {},
  ) {}

  isEmpty(): boolean {
    return this.body === '';
  }

  statusCodeIsClientError(): boolean {
    return this.statusCode >= 400 && this.statusCode < 500;
  }

  statusCodeIsServerError(): boolean {
    return this.statusCode >= 500 && this.statusCode < 600;
  }

  /** Serialización para logs: el body se trunca (los paquetes pueden pesar MB) */
  toJSON(): { statusCode: number; headers: Headers; body: string; bodyLength: number } {
    const max = 2000;
    const body = this.body.length > max ? `${this.body.slice(0, max)}…` : this.body;
    return { statusCode: this.statusCode, headers: this.headers, body, bodyLength: this.body.length };
  }
}
