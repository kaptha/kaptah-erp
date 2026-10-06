import { ForbiddenException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import * as http from 'http';
import * as https from 'https';

export interface CuentaResuelta {
  /** Cuenta sobre la que se opera (la propia o la de un cliente del contador). */
  cuentaUid: string;
  /** RFC de esa cuenta según biz-entities-api; null si no se pudo obtener. */
  rfc: string | null;
}

interface CuentaDeUsuario {
  cuentaFirebaseUid: string;
  rfcCuenta?: string | null;
  esPropia?: boolean;
}

/**
 * Decide sobre qué cuenta opera cada petición.
 *
 * - Sin cuenta indicada, o la misma que el usuario: opera sobre su propia cuenta.
 * - Con otra cuenta (sub-usuario, p. ej. el contador del Plan Despacho): solo se
 *   permite si biz-entities-api la lista entre las cuentas del usuario
 *   (tabla usuario_roles). Si no se puede verificar, se rechaza.
 *
 * Las listas de cuentas se guardan en memoria 5 minutos para no consultar
 * biz-entities-api en cada petición.
 */
@Injectable()
export class CuentaAccessService {
  private readonly logger = new Logger(CuentaAccessService.name);
  private readonly cache = new Map<string, { cuentas: CuentaDeUsuario[]; expira: number }>();
  private readonly ttlMs = 5 * 60 * 1000;
  private readonly timeoutMs = 5000;

  async resolver(uid: string, cuentaSolicitada?: string): Promise<CuentaResuelta> {
    const cuentaUid = (cuentaSolicitada || '').trim() || uid;
    const esPropia = cuentaUid === uid;

    let cuentas: CuentaDeUsuario[];
    try {
      cuentas = await this.cuentasDelUsuario(uid);
    } catch (err) {
      if (esPropia) {
        // El dueño siempre puede operar su propia cuenta; solo nos quedamos sin su RFC.
        this.logger.warn(`[CUENTA_ACCESS] no se pudo consultar biz-entities-api para ${uid}: ${err.message}`);
        return { cuentaUid, rfc: null };
      }
      this.logger.error(`[CUENTA_ACCESS] no se pudo verificar ${uid} -> ${cuentaUid}: ${err.message}`);
      throw new ServiceUnavailableException('No se pudo verificar el acceso a la cuenta. Intenta de nuevo.');
    }

    const cuenta = cuentas.find(c => c.cuentaFirebaseUid === cuentaUid);
    if (!cuenta && !esPropia) {
      this.logger.warn(`[CUENTA_ACCESS] usuario ${uid} intento operar cuenta ${cuentaUid} sin rol asignado -> RECHAZADO`);
      throw new ForbiddenException('No tienes acceso a esta cuenta');
    }

    return { cuentaUid, rfc: cuenta?.rfcCuenta || null };
  }

  private async cuentasDelUsuario(uid: string): Promise<CuentaDeUsuario[]> {
    const enCache = this.cache.get(uid);
    if (enCache && enCache.expira > Date.now()) {
      return enCache.cuentas;
    }

    const base = (process.env.BIZ_ENTITIES_API_URL || '').trim().replace(/\/+$/, '');
    if (!base) {
      throw new Error('BIZ_ENTITIES_API_URL no esta configurada');
    }
    const prefijo = base.endsWith('/api') ? base : `${base}/api`;
    const url = `${prefijo}/roles/user-accounts/${encodeURIComponent(uid)}`;

    const headers: Record<string, string> = { Accept: 'application/json' };
    if (process.env.INTERNAL_API_KEY) {
      headers['x-internal-api-key'] = process.env.INTERNAL_API_KEY;
    }

    const data = await this.getJson(url, headers);
    const cuentas: CuentaDeUsuario[] = Array.isArray(data) ? data : [];
    this.cache.set(uid, { cuentas, expira: Date.now() + this.ttlMs });
    return cuentas;
  }

  private getJson(url: string, headers: Record<string, string>): Promise<any> {
    return new Promise((resolve, reject) => {
      const cliente = url.startsWith('https:') ? https : http;
      const req = cliente.get(url, { headers, timeout: this.timeoutMs }, res => {
        let cuerpo = '';
        res.setEncoding('utf8');
        res.on('data', chunk => (cuerpo += chunk));
        res.on('end', () => {
          if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
            return reject(new Error(`HTTP ${res.statusCode} en ${url}`));
          }
          try {
            resolve(cuerpo ? JSON.parse(cuerpo) : null);
          } catch (e) {
            reject(new Error(`Respuesta no JSON de ${url}`));
          }
        });
      });
      req.on('timeout', () => req.destroy(new Error(`Timeout de ${this.timeoutMs} ms en ${url}`)));
      req.on('error', reject);
    });
  }
}
