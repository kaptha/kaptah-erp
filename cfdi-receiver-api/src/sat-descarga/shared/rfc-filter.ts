/**
 * Base para filtros por RFC. Permite un valor vacío (= sin filtro).
 * Equivale a Shared/AbstractRfcFilter.php.
 *
 * Valida RFC mexicano: 3 letras (moral) o 4 (física) + fecha AAMMDD + homoclave.
 * Acepta los genéricos XAXX010101000 y XEXX010101000.
 */
const RFC_PATTERN = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/;

export function isValidRfc(value: string): boolean {
  return RFC_PATTERN.test(value.trim().toUpperCase());
}

export abstract class RfcFilter {
  protected constructor(readonly value: string) {}

  protected static validate(value: string): string {
    const rfc = value.trim().toUpperCase();
    if (!isValidRfc(rfc)) {
      throw new Error(`RFC inválido: "${value}"`);
    }
    return rfc;
  }

  isEmpty(): boolean {
    return this.value === '';
  }

  toJSON(): string {
    return this.value;
  }

  toString(): string {
    return this.value;
  }
}

/** RFC contraparte a filtrar (emisor o receptor según DownloadType). Shared/RfcMatch.php */
export class RfcMatch extends RfcFilter {
  static create(value: string): RfcMatch {
    return new RfcMatch(RfcFilter.validate(value));
  }

  static empty(): RfcMatch {
    return new RfcMatch('');
  }
}

/** RfcACuentaTerceros. Shared/RfcOnBehalf.php */
export class RfcOnBehalf extends RfcFilter {
  static create(value: string): RfcOnBehalf {
    return new RfcOnBehalf(RfcFilter.validate(value));
  }

  static empty(): RfcOnBehalf {
    return new RfcOnBehalf('');
  }
}
