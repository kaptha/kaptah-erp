import { ComplementoCfdi } from '../../shared/complemento-cfdi';
import { DocumentStatus, documentStatusQueryValue } from '../../shared/document-status';
import { DownloadType } from '../../shared/download-type';
import { RequestType } from '../../shared/request-type';
import { SatDateTime } from '../../shared/sat-date-time';
import { ServiceType } from '../../shared/service-type';
import type { QueryParameters } from './query-parameters';

/** Máximo de RFC receptores en una consulta de emitidos */
export const MAX_RFC_RECEIVERS = 5;
/** Antigüedad máxima del periodo consultado, en años */
export const MAX_YEARS_BACK = 6;

/**
 * Reglas que el SAT aplica antes de aceptar una solicitud; validarlas aquí evita
 * gastar una solicitud (hay cupo diario) en algo que será rechazado.
 * Equivale a Services/Query/QueryValidator.php.
 */
export class QueryValidator {
  validate(query: QueryParameters, now: Date = new Date()): string[] {
    return query.uuid.isEmpty() ? this.validateQuery(query, now) : this.validateFolio(query);
  }

  private validateFolio(query: QueryParameters): string[] {
    const errors: string[] = [];
    if (!query.rfcMatches.isEmpty()) {
      errors.push('En una consulta por UUID no se debe usar el filtro de RFC.');
    }
    if (!query.complement.isUndefined()) {
      errors.push('En una consulta por UUID no se debe usar el filtro de complemento.');
    }
    if (query.documentStatus !== DocumentStatus.Undefined) {
      errors.push('En una consulta por UUID no se debe usar el filtro de estado de documento.');
    }
    if (query.documentType !== '') {
      errors.push('En una consulta por UUID no se debe usar el filtro de tipo de documento.');
    }
    return errors;
  }

  private validateQuery(query: QueryParameters, now: Date): string[] {
    const errors: string[] = [];
    const { start, end } = query.period;

    if (start.compareTo(end) >= 0) {
      errors.push(
        `La fecha de inicio (${start.formatSat()}) no puede ser mayor o igual a la fecha final (${end.formatSat()}) del periodo de consulta.`,
      );
    }

    // "hoy menos 6 años, a medianoche", en hora de pared del proceso
    const minimal = SatDateTime.create(`${now.getFullYear() - MAX_YEARS_BACK}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`);
    if (start.compareTo(minimal) < 0) {
      errors.push(
        `La fecha de inicio (${start.formatSat()}) no puede ser menor a hoy menos ${MAX_YEARS_BACK} años atrás (${minimal.formatSat()}).`,
      );
    }

    const received = query.downloadType === DownloadType.Received;
    const issued = query.downloadType === DownloadType.Issued;

    if (received && query.requestType === RequestType.Xml && query.documentStatus !== DocumentStatus.Active) {
      errors.push(
        `No es posible hacer una consulta de XML Recibidos que contenga Cancelados. Solicitado: ${documentStatusQueryValue(query.documentStatus)}.`,
      );
    }

    if (received && query.rfcMatches.count > 1) {
      errors.push('No es posible hacer una consulta de Recibidos con más de 1 RFC emisor.');
    }

    if (issued && query.rfcMatches.count > MAX_RFC_RECEIVERS) {
      errors.push(`No es posible hacer una consulta de Emitidos con más de ${MAX_RFC_RECEIVERS} RFC receptores.`);
    }

    if (query.serviceType === ServiceType.Cfdi && !query.complement.isUndefined() && !(query.complement instanceof ComplementoCfdi)) {
      errors.push(`El complemento de CFDI definido no es un complemento registrado de este tipo (${query.complement.label}).`);
    }

    // ComplementoRetenciones no está portado: cualquier complemento en retenciones es inválido por ahora
    if (query.serviceType === ServiceType.Retenciones && !query.complement.isUndefined()) {
      errors.push(`El complemento de Retenciones definido no es un complemento registrado de este tipo (${query.complement.label}).`);
    }

    return errors;
  }
}

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}
