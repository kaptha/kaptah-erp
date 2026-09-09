import { Complemento } from '../shared/complemento-cfdi';
import { DateTimePeriod } from '../shared/date-time-period';
import { DocumentStatus } from '../shared/document-status';
import { DocumentType } from '../shared/document-type';
import { DownloadType } from '../shared/download-type';
import { RequestType } from '../shared/request-type';
import { RfcOnBehalf } from '../shared/rfc-filter';
import { RfcMatches } from '../shared/rfc-matches';
import { ServiceType } from '../shared/service-type';
import { Uuid } from '../shared/uuid';

/**
 * Vista de solo lectura de los parámetros de consulta que necesita el builder.
 * QueryParameters (fase 4) implementa esta interfaz.
 */
export interface QueryParametersView {
  readonly serviceType: ServiceType;
  readonly period: DateTimePeriod;
  readonly downloadType: DownloadType;
  readonly requestType: RequestType;
  readonly documentType: DocumentType;
  readonly complement: Complemento;
  readonly documentStatus: DocumentStatus;
  readonly uuid: Uuid;
  readonly rfcOnBehalf: RfcOnBehalf;
  readonly rfcMatches: RfcMatches;
}

/**
 * Genera los cuatro mensajes SOAP firmados. RFC, certificado y llave quedan
 * fuera de la interfaz. Equivale a RequestBuilder/RequestBuilderInterface.php.
 * Token de inyección para Nest: REQUEST_BUILDER.
 */
export const REQUEST_BUILDER = Symbol('SAT_DESCARGA_REQUEST_BUILDER');

export interface RequestBuilder {
  /** @param securityTokenId si va vacío se genera uno */
  authorization(created: Date, expires: Date, securityTokenId?: string): string;
  query(parameters: QueryParametersView): string;
  verify(requestId: string): string;
  download(packageId: string): string;
}
