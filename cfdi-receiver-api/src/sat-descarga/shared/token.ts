/**
 * Token de autenticación que entrega el SAT (vigencia ~5 min).
 * Equivale a Shared/Token.php.
 *
 * Usa Date real (no SatDateTime) porque se compara contra el reloj del sistema.
 * fromJSON() no existe en PHP; se agrega para rehidratar desde Redis.
 */
export interface TokenJson {
  created: string;
  expires: string;
  value: string;
}

export class Token {
  constructor(
    readonly created: Date,
    readonly expires: Date,
    readonly value: string,
  ) {
    if (expires.getTime() < created.getTime()) {
      throw new Error('No se puede crear un token con expiración anterior a su creación');
    }
  }

  static empty(): Token {
    return new Token(new Date(0), new Date(0), '');
  }

  static fromJSON(json: TokenJson | string): Token {
    const j: TokenJson = typeof json === 'string' ? JSON.parse(json) : json;
    return new Token(new Date(j.created), new Date(j.expires), j.value);
  }

  isValueEmpty(): boolean {
    return this.value === '';
  }

  /** Expirado si la fecha de expiración ya pasó (con margen opcional en segundos) */
  isExpired(marginSeconds = 0, now: Date = new Date()): boolean {
    return this.expires.getTime() - marginSeconds * 1000 < now.getTime();
  }

  isValid(marginSeconds = 0, now: Date = new Date()): boolean {
    return !this.isValueEmpty() && !this.isExpired(marginSeconds, now);
  }

  /** Segundos restantes de vida; útil como TTL de Redis */
  secondsToExpire(now: Date = new Date()): number {
    return Math.max(0, Math.floor((this.expires.getTime() - now.getTime()) / 1000));
  }

  toJSON(): TokenJson {
    return {
      created: this.created.toISOString(),
      expires: this.expires.toISOString(),
      value: this.value,
    };
  }
}
