import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, ForbiddenException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import * as admin from 'firebase-admin';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  private readonly logger = new Logger(FirebaseAuthGuard.name);

  constructor(
    private reflector: Reflector,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      this.logger.log('Ruta publica, permitiendo acceso');
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const cuentaUid = this.readCuentaUid(request);

    // Aceptar x-internal-api-key como alternativa a Firebase token
    const internalApiKey = request.headers['x-internal-api-key'];
    if (internalApiKey && internalApiKey === process.env.INTERNAL_API_KEY) {
      this.logger.log('Acceso interno con API Key valido');
      if (cuentaUid) {
        request['user'] = { firebaseUid: cuentaUid };
      }
      return true;
    }

    const token = request.headers.authorization;
    if (!token) {
      this.logger.error('No se proporciono token');
      throw new UnauthorizedException('No token provided');
    }

    let decodedToken: admin.auth.DecodedIdToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(token.replace('Bearer ', ''));
    } catch (err) {
      this.logger.error('Token invalido: ' + err.message);
      throw new UnauthorizedException('Invalid token');
    }

    this.logger.log(`Token valido. Usuario: ${decodedToken.uid} (${decodedToken.email})`);
    request['user'] = {
      firebaseUid: decodedToken.uid,
      email: decodedToken.email,
    };

    // Validar que el usuario tenga relacion con la cuenta que intenta operar
    if (cuentaUid && cuentaUid !== decodedToken.uid) {
      const permitido = await this.tieneAccesoACuenta(decodedToken.uid, cuentaUid);
      if (!permitido) {
        const enforce = process.env.ENFORCE_CUENTA_ACCESS === 'true';
        this.logger.warn(
          `[CUENTA_ACCESS] usuario ${decodedToken.uid} intento operar cuenta ${cuentaUid} sin rol asignado` +
          ` (${request.method} ${request.url})` + (enforce ? ' -> RECHAZADO' : ' -> permitido (modo observacion)'),
        );
        if (enforce) {
          throw new ForbiddenException('No tienes acceso a esta cuenta');
        }
      }
    }

    return true;
  }

  private readCuentaUid(request: any): string | undefined {
    const raw = request.query?.cuentaUid;
    if (Array.isArray(raw)) return raw[0];
    return typeof raw === 'string' && raw.trim() ? raw.trim() : undefined;
  }

  private async tieneAccesoACuenta(usuarioUid: string, cuentaUid: string): Promise<boolean> {
    try {
      const rows = await this.dataSource.query(
        'SELECT 1 FROM usuario_roles WHERE usuario_firebase_uid = ? AND cuenta_firebase_uid = ? LIMIT 1',
        [usuarioUid, cuentaUid],
      );
      return Array.isArray(rows) && rows.length > 0;
    } catch (err) {
      // Ante error de BD no bloquear: registrar y dejar pasar (se revisa en logs)
      this.logger.error('Error verificando acceso a cuenta: ' + err.message);
      return true;
    }
  }
}