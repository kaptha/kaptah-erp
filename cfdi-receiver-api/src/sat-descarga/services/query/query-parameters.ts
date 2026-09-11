import { QueryParametersView } from '../../request-builder/request-builder.interface';
import { Complemento, ComplementoCfdi } from '../../shared/complemento-cfdi';
import { DateTimePeriod } from '../../shared/date-time-period';
import { DocumentStatus } from '../../shared/document-status';
import { DocumentType } from '../../shared/document-type';
import { DownloadType } from '../../shared/download-type';
import { RequestType } from '../../shared/request-type';
import { RfcMatch, RfcOnBehalf } from '../../shared/rfc-filter';
import { RfcMatches } from '../../shared/rfc-matches';
import { ServiceType } from '../../shared/service-type';
import { Uuid } from '../../shared/uuid';
import { QueryValidator } from './query-validator';

interface Props {
  period: DateTimePeriod;
  downloadType: DownloadType;
  requestType: RequestType;
  documentType: DocumentType;
  complement: Complemento;
  documentStatus: DocumentStatus;
  uuid: Uuid;
  rfcOnBehalf: RfcOnBehalf;
  rfcMatches: RfcMatches;
  serviceType: ServiceType;
}

/**
 * Parámetros inmutables de una solicitud de descarga; cada with*() devuelve una copia.
 * Equivale a Services/Query/QueryParameters.php.
 */
export class QueryParameters implements QueryParametersView {
  readonly period: DateTimePeriod;
  readonly downloadType: DownloadType;
  readonly requestType: RequestType;
  readonly documentType: DocumentType;
  readonly complement: Complemento;
  readonly documentStatus: DocumentStatus;
  readonly uuid: Uuid;
  readonly rfcOnBehalf: RfcOnBehalf;
  readonly rfcMatches: RfcMatches;
  readonly serviceType: ServiceType;

  private constructor(p: Props) {
    this.period = p.period;
    this.downloadType = p.downloadType;
    this.requestType = p.requestType;
    this.documentType = p.documentType;
    this.complement = p.complement;
    this.documentStatus = p.documentStatus;
    this.uuid = p.uuid;
    this.rfcOnBehalf = p.rfcOnBehalf;
    this.rfcMatches = p.rfcMatches;
    this.serviceType = p.serviceType;
  }

  /**
   * Defaults: emitidos, metadata, CFDI, sin filtros.
   * El periodo por defecto es "ahora" (inválido a propósito): hay que fijarlo con withPeriod().
   */
  static create(period?: DateTimePeriod, downloadType?: DownloadType, requestType?: RequestType, serviceType?: ServiceType): QueryParameters {
    const now = new Date().toISOString().slice(0, 19);
    return new QueryParameters({
      period: period ?? DateTimePeriod.createFromValues(now, now),
      downloadType: downloadType ?? DownloadType.Issued,
      requestType: requestType ?? RequestType.Metadata,
      documentType: DocumentType.Undefined,
      complement: ComplementoCfdi.undefined(),
      documentStatus: DocumentStatus.Undefined,
      uuid: Uuid.empty(),
      rfcOnBehalf: RfcOnBehalf.empty(),
      rfcMatches: RfcMatches.empty(),
      serviceType: serviceType ?? ServiceType.Cfdi,
    });
  }

  get rfcMatch(): RfcMatch {
    return this.rfcMatches.first();
  }

  withServiceType(v: ServiceType): QueryParameters { return this.with({ serviceType: v }); }
  withPeriod(v: DateTimePeriod): QueryParameters { return this.with({ period: v }); }
  withDownloadType(v: DownloadType): QueryParameters { return this.with({ downloadType: v }); }
  withRequestType(v: RequestType): QueryParameters { return this.with({ requestType: v }); }
  withDocumentType(v: DocumentType): QueryParameters { return this.with({ documentType: v }); }
  withComplement(v: Complemento): QueryParameters { return this.with({ complement: v }); }
  withDocumentStatus(v: DocumentStatus): QueryParameters { return this.with({ documentStatus: v }); }
  withUuid(v: Uuid): QueryParameters { return this.with({ uuid: v }); }
  withRfcOnBehalf(v: RfcOnBehalf): QueryParameters { return this.with({ rfcOnBehalf: v }); }
  withRfcMatches(v: RfcMatches): QueryParameters { return this.with({ rfcMatches: v }); }
  withRfcMatch(v: RfcMatch): QueryParameters { return this.with({ rfcMatches: RfcMatches.create(v) }); }

  private with(patch: Partial<Props>): QueryParameters {
    return new QueryParameters({ ...this.toProps(), ...patch });
  }

  private toProps(): Props {
    const { period, downloadType, requestType, documentType, complement, documentStatus, uuid, rfcOnBehalf, rfcMatches, serviceType } = this;
    return { period, downloadType, requestType, documentType, complement, documentStatus, uuid, rfcOnBehalf, rfcMatches, serviceType };
  }

  /** Lista de errores de validación; vacía si la consulta es válida */
  validate(now: Date = new Date()): string[] {
    return new QueryValidator().validate(this, now);
  }

  toJSON(): Record<string, unknown> {
    return {
      serviceType: this.serviceType,
      period: this.period.toJSON(),
      downloadType: this.downloadType,
      requestType: this.requestType,
      documentType: this.documentType,
      complement: this.complement.value,
      documentStatus: this.documentStatus,
      uuid: this.uuid.value,
      rfcOnBehalf: this.rfcOnBehalf.value,
      rfcMatches: this.rfcMatches.toJSON(),
    };
  }
}
