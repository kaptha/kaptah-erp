import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'node:crypto';

/**
 * Autenticación servicio-a-servicio para rutas /internal/*.
 * El llamador envía X-Service-Token igual a VAULT_SERVICE_TOKEN (variable de Railway).
 * Comparación en tiempo constante.
 */
@Injectable()
export class ServiceTokenGuard implements CanActivate {
  private readonly expected: Buffer;

  constructor(config: ConfigService) {
    const token = config.get<string>('VAULT_SERVICE_TOKEN') ?? '';
    if (token.length < 32) {
      throw new Error('VAULT_SERVICE_TOKEN debe tener al menos 32 caracteres (openssl rand -hex 32)');
    }
    this.expected = Buffer.from(token);
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ headers: Record<string, string | string[] | undefined> }>();
    const header = request.headers['x-service-token'];
    const received = Buffer.from(Array.isArray(header) ? header[0] ?? '' : header ?? '');
    if (received.length !== this.expected.length || !timingSafeEqual(received, this.expected)) {
      throw new UnauthorizedException('Token de servicio inválido');
    }
    return true;
  }
}
