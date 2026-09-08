/**
 * Fecha/hora "de reloj de pared" sin zona horaria, como la espera el SAT
 * en FechaInicial / FechaFinal (formato YYYY-MM-DDTHH:mm:ss).
 * Equivale a una versión mínima de Shared/DateTime.php.
 *
 * Internamente guarda un Date interpretado como UTC y formatea con getters
 * UTC, así el valor que entra es exactamente el que sale, sin importar la
 * zona horaria del proceso (Railway corre en UTC).
 */
export class SatDateTime {
  private static readonly PATTERN =
    /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?$/;

  private constructor(private readonly value: Date) {}

  /**
   * Acepta 'YYYY-MM-DD', 'YYYY-MM-DDTHH:mm', 'YYYY-MM-DDTHH:mm:ss' o una SatDateTime.
   * Si falta la hora se asume 00:00:00.
   */
  static create(input: string | SatDateTime): SatDateTime {
    if (input instanceof SatDateTime) {
      return input;
    }
    const m = SatDateTime.PATTERN.exec(input.trim());
    if (!m) {
      throw new Error(`Fecha inválida para el SAT: "${input}" (se espera YYYY-MM-DDTHH:mm:ss)`);
    }
    const [, y, mo, d, h = '0', mi = '0', s = '0'] = m;
    const date = new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +s));
    // Detecta fechas imposibles (2026-02-30) que Date.UTC "corrige" silenciosamente
    if (date.getUTCMonth() !== +mo - 1 || date.getUTCDate() !== +d) {
      throw new Error(`Fecha inexistente: "${input}"`);
    }
    return new SatDateTime(date);
  }

  /** Formato que exige el SAT: YYYY-MM-DDTHH:mm:ss */
  formatSat(): string {
    return this.value.toISOString().slice(0, 19);
  }

  /** Negativo si this < other, 0 si iguales, positivo si this > other */
  compareTo(other: SatDateTime): number {
    return this.value.getTime() - other.value.getTime();
  }

  toJSON(): string {
    return this.formatSat();
  }

  toString(): string {
    return this.formatSat();
  }
}
