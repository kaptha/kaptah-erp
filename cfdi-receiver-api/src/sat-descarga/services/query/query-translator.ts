import { Element } from '@xmldom/xmldom';
import { findAttributes, findElement, readXmlElement } from '../../internal/xml';
import { RequestBuilder } from '../../request-builder/request-builder.interface';
import { StatusCode } from '../../shared/status-code';
import { QueryParameters } from './query-parameters';
import { QueryResult } from './query-result';

/**
 * Traduce entre el dominio y el SOAP de SolicitaDescarga{Emitidos,Recibidos,Folio}.
 * Equivale a Services/Query/QueryTranslator.php.
 */
export class QueryTranslator {
  private resolveResponsePath(envelope: Element): string[] {
    const candidates: Array<[string, string]> = [
      ['solicitaDescargaEmitidosResponse', 'solicitaDescargaEmitidosResult'],
      ['solicitaDescargaRecibidosResponse', 'solicitaDescargaRecibidosResult'],
      ['solicitaDescargaFolioResponse', 'solicitaDescargaFolioResult'],
    ];
    for (const [response, result] of candidates) {
      if (findElement(envelope, 'body', response)) {
        return ['body', response, result];
      }
    }
    return [];
  }

  createQueryResultFromSoapResponse(content: string): QueryResult {
    const env = readXmlElement(content);
    const path = this.resolveResponsePath(env);
    const values = path.length ? findAttributes(env, ...path) : {};
    const status = new StatusCode(parseInt(values.codestatus ?? '0', 10) || 0, values.mensaje ?? '');
    return new QueryResult(status, values.idsolicitud ?? '');
  }

  createSoapRequest(requestBuilder: RequestBuilder, parameters: QueryParameters): string {
    return requestBuilder.query(parameters);
  }
}
