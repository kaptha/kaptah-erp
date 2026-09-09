import { findContent, readXmlElement } from '../../internal/xml';
import { RequestBuilder } from '../../request-builder/request-builder.interface';
import { Token } from '../../shared/token';

/** Vigencia que se pide en el timestamp de autenticación (el SAT concede 5 min) */
export const TOKEN_LIFETIME_MS = 5 * 60 * 1000;

/**
 * Traduce entre el dominio y el SOAP de Autentica.
 * Equivale a Services/Authenticate/AuthenticateTranslator.php.
 */
export class AuthenticateTranslator {
  createTokenFromSoapResponse(content: string): Token {
    const env = readXmlElement(content);
    const created = findContent(env, 'header', 'security', 'timestamp', 'created');
    const expires = findContent(env, 'header', 'security', 'timestamp', 'expires');
    const value = findContent(env, 'body', 'autenticaResponse', 'autenticaResult');
    return new Token(
      created ? new Date(created) : new Date(0),
      expires ? new Date(expires) : new Date(0),
      value,
    );
  }

  createSoapRequest(requestBuilder: RequestBuilder, now: Date = new Date()): string {
    const until = new Date(now.getTime() + TOKEN_LIFETIME_MS);
    return this.createSoapRequestWithData(requestBuilder, now, until);
  }

  createSoapRequestWithData(requestBuilder: RequestBuilder, since: Date, until: Date, securityTokenId = ''): string {
    return requestBuilder.authorization(since, until, securityTokenId);
  }
}
