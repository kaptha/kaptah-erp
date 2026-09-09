/**
 * Representación mínima de una petición HTTP al SAT.
 * Equivale a WebClient/Request.php.
 * Fusiona headers por defecto con los recibidos y descarta valores vacíos.
 */
export type Headers = Record<string, string>;

export class Request {
  readonly headers: Headers;

  constructor(
    readonly method: string,
    readonly uri: string,
    readonly body: string,
    headers: Headers = {},
  ) {
    const merged: Headers = { ...Request.defaultHeaders(), ...headers };
    this.headers = Object.fromEntries(Object.entries(merged).filter(([, v]) => v !== ''));
  }

  static defaultHeaders(): Headers {
    return {
      'Content-type': 'text/xml; charset="utf-8"',
      Accept: 'text/xml',
      'Cache-Control': 'no-cache',
    };
  }

  /**
   * Serialización segura para logs: omite el body (lleva certificado y firma)
   * y enmascara el token de autorización.
   */
  toJSON(): { method: string; uri: string; headers: Headers; bodyLength: number } {
    const headers = { ...this.headers };
    if (headers.Authorization) {
      headers.Authorization = 'WRAP access_token="***"';
    }
    return { method: this.method, uri: this.uri, headers, bodyLength: this.body.length };
  }
}
