import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import * as admin from 'firebase-admin';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  private readonly logger = new Logger(FirebaseAuthGuard.name);
  constructor(private reflector: Reflector) {}

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      this.logger.log('🔓 Ruta publica, permitiendo acceso');
      return true;
    }

    const request = context.switchToHttp().getRequest();

    // Aceptar x-internal-api-key como alternativa a Firebase token
    const internalApiKey = request.headers['x-internal-api-key'];
    if (internalApiKey && internalApiKey === process.env.INTERNAL_API_KEY) {
      this.logger.log('🔑 Acceso interno con API Key valido');
      // Si viene cuentaUid en query, simular el user con ese UID
      const cuentaUid = request.query?.cuentaUid;
      if (cuentaUid) {
        request['user'] = { firebaseUid: cuentaUid };
      }
      return true;
    }

    const token = request.headers.authorization;
    if (!token) {
      this.logger.error('❌ No se proporciono token');
      throw new UnauthorizedException('No token provided');
    }

    const cleanToken = token.replace('Bearer ', '');

    return this.validateToken(cleanToken)
      .then((decodedToken) => {
        this.logger.log('✅ Token valido');
        this.logger.log(`👤 Usuario: ${decodedToken.uid} (${decodedToken.email})`);
        request['user'] = {
          firebaseUid: decodedToken.uid,
          email: decodedToken.email,
        };
        return true;
      })
      .catch((err) => {
        this.logger.error('❌ Token invalido:', err.message);
        throw new UnauthorizedException('Invalid token');
      });
  }

  private validateToken(token: string): Promise<admin.auth.DecodedIdToken> {
    return admin.auth().verifyIdToken(token);
  }
}