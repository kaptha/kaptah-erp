import { SatDateTime } from './sat-date-time';

/**
 * Periodo [start, end] para una solicitud de descarga.
 * Equivale a Shared/DateTimePeriod.php.
 */
export class DateTimePeriod {
  private constructor(
    readonly start: SatDateTime,
    readonly end: SatDateTime,
  ) {
    if (end.compareTo(start) < 0) {
      throw new Error('La fecha final debe ser mayor o igual a la fecha inicial');
    }
  }

  static create(start: SatDateTime, end: SatDateTime): DateTimePeriod {
    return new DateTimePeriod(start, end);
  }

  /** Construye a partir de strings 'YYYY-MM-DDTHH:mm:ss' */
  static createFromValues(start: string | SatDateTime, end: string | SatDateTime): DateTimePeriod {
    return new DateTimePeriod(SatDateTime.create(start), SatDateTime.create(end));
  }

  toJSON(): { start: string; end: string } {
    return { start: this.start.formatSat(), end: this.end.formatSat() };
  }
}
