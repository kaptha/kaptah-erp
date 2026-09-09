/** Equivale a RequestBuilder/RequestBuilderException.php */
export class RequestBuilderError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = 'RequestBuilderError';
    Object.setPrototypeOf(this, RequestBuilderError.prototype);
  }
}
