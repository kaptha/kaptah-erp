import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import * as http from 'http';
import * as https from 'https';
import { FirebaseAdminConfig } from '../firebase-admin.config';

/**
 * Valida el token de Firebase y, si la petición trae ?cuentaUid= de otra cuenta,
 * verifica en biz-entities-api (usuario_roles) que el usuario tenga rol en ella.
 *
 * ENFORCE_CUENTA_ACCESS:
 *   - 'true'  -> rechaza con 403 (o 503 si no se puede verificar)
 *   - otro    -> modo observación: deja pasar y registra [CUENTA_ACCESS] en logs
 */
@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  private static readonly logger = new Logger('FirebaseAuthGuard');
  private static readonly cache = new Map<string, { cuentas: string[]; expira: number }>();
  private static readonly ttlMs = 5 * 60 * 1000;
  private static readonly timeoutMs = 5000;

  constructor(private firebaseAdmin: FirebaseAdminConfig) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    if (request.method === 'OPTIONS') {
      return true;
    }

    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('No token provided');
    }

    const token = authHeader.split('Bearer ')[1];
    let uid: string;
    let email: string | undefined;
    try {
      const decodedToken = await this.firebaseAdmin.getAuth().verifyIdToken(token);
      uid = decodedToken.uid;
      email = decodedToken.email;
    } catch (error) {
      FirebaseAuthGuard.logger.warn(`Token invalido (${request.method} ${request.path}): ${error.message}`);
      throw new UnauthorizedException('Invalid token');
    }

    request.user = { id: uid, email };

    const cuentaUid = this.leerCuentaUid(request);
    if (cuentaUid && cuentaUid !== uid) {
      await this.verificarAcceso(uid, cuentaUid, `${request.method} ${request.path}`);
    }

    return true;
  }

  private leerCuentaUid(request: any): string | undefined {
    const raw = request.query?.cuentaUid;
    const v = Array.isArray(raw) ? raw[0] : raw;
    return typeof v === 'string' && v.trim() ? v.trim() : undefined;
  }

  private async verificarAcceso(uid: string, cuentaUid: string, ruta: string): Promise<void> {
    const enforce = process.env.ENFORCE_CUENTA_ACCESS === 'true';
    const modo = enforce ? 'RECHAZADO' : 'permitido (modo observacion)';

    let cuentas: string[];
    try {
      cuentas = await this.cuentasDelUsuario(uid);
    } catch (err) {
      FirebaseAuthGuard.logger.error(
        `[CUENTA_ACCESS] no se pudo verificar ${uid} -> ${cuentaUid} (${ruta}): ${err.message} -> ${modo}`,
      );
      if (enforce) {
        throw new ServiceUnavailableException('No se pudo verificar el acceso a la cuenta. Intenta de nuevo.');
      }
      return;
    }

    if (!cuentas.includes(cuentaUid)) {
      FirebaseAuthGuard.logger.warn(
        `[CUENTA_ACCESS] usuario ${uid} intento operar cuenta ${cuentaUid} sin rol asignado (${ruta}) -> ${modo}`,
      );
      if (enforce) {
        throw new ForbiddenException('No tienes acceso a esta cuenta');
      }
    }
  }

  private async cuentasDelUsuario(uid: string): Promise<string[]> {
    const enCache = FirebaseAuthGuard.cache.get(uid);
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
    const cuentas = (Array.isArray(data) ? data : [])
      .map((c: any) => c?.cuentaFirebaseUid)
      .filter((c: any) => typeof c === 'string' && c);
    FirebaseAuthGuard.cache.set(uid, { cuentas, expira: Date.now() + FirebaseAuthGuard.ttlMs });
    return cuentas;
  }

  private getJson(url: string, headers: Record<string, string>): Promise<any> {
    return new Promise((resolve, reject) => {
      const cliente = url.startsWith('https:') ? https : http;
      const req = cliente.get(url, { headers, timeout: FirebaseAuthGuard.timeoutMs }, res => {
        let cuerpo = '';
        res.setEncoding('utf8');
        res.on('data', chunk => (cuerpo += chunk));
        res.on('end', () => {
          if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
            return reject(new Error(`HTTP ${res.statusCode} en ${url}`));
          }
          try {
            resolve(cuerpo ? JSON.parse(cuerpo) : null);
          } catch {
            reject(new Error(`Respuesta no JSON de ${url}`));
          }
        });
      });
      req.on('timeout', () => req.destroy(new Error(`Timeout de ${FirebaseAuthGuard.timeoutMs} ms en ${url}`)));
      req.on('error', reject);
    });
  }
}
