import { Token } from '../../shared/token';

/**
 * Cache de tokens por clave (en Kaptah: `sat-descarga:token:<cuentaUid>`).
 * La implementación Redis vive en el módulo de Nest (fase 8); esta interfaz
 * mantiene el dominio libre de infraestructura.
 */
export interface TokenCache {
  get(key: string): Promise<Token | null>;
  set(key: string, token: Token, ttlSeconds: number): Promise<void>;
  delete(key: string): Promise<void>;
}

/** Margen de seguridad: un token con menos de 60 s de vida se considera vencido */
export const TOKEN_SAFETY_MARGIN_SECONDS = 60;

/**
 * Devuelve un token válido de la cache o autentica y lo guarda.
 * Equivale a la lógica de Service::obtainCurrentToken() en Service.php.
 */
export async function obtainToken(
  cache: TokenCache,
  key: string,
  authenticate: () => Promise<Token>,
  now: Date = new Date(),
): Promise<Token> {
  const cached = await cache.get(key);
  if (cached && cached.isValid(TOKEN_SAFETY_MARGIN_SECONDS, now)) {
    return cached;
  }
  const token = await authenticate();
  const ttl = token.secondsToExpire(now);
  if (token.isValid(TOKEN_SAFETY_MARGIN_SECONDS, now) && ttl > 0) {
    await cache.set(key, token, ttl);
  }
  return token;
}

/** Cache en memoria del proceso; útil en pruebas y en el script de humo */
export class InMemoryTokenCache implements TokenCache {
  private readonly map = new Map<string, { token: Token; expiresAt: number }>();

  async get(key: string): Promise<Token | null> {
    const entry = this.map.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.map.delete(key);
      return null;
    }
    return entry.token;
  }

  async set(key: string, token: Token, ttlSeconds: number): Promise<void> {
    this.map.set(key, { token, expiresAt: Date.now() + ttlSeconds * 1000 });
  }

  async delete(key: string): Promise<void> {
    this.map.delete(key);
  }
}
