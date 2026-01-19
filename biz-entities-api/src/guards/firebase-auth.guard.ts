import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import * as admin from 'firebase-admin';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  private readonly logger = new Logger(FirebaseAuthGuard.name); // ⭐ NUEVO
  constructor(private reflector: Reflector) {} // ← NUEVO: Inyectar Reflector

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    // ⭐ NUEVO: Verificar si la ruta es pública
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    
    // Si la ruta es pública, permitir acceso sin autenticación
    if (isPublic) {
      this.logger.log('🔓 Ruta pública, permitiendo acceso');
      return true;
    }
    
    // ✅ Tu código original para rutas protegidas
    const request = context.switchToHttp().getRequest();
    const token = request.headers.authorization;
    // ⭐ NUEVO: Logs para debug
    this.logger.log('🔐 Validando token...');
    this.logger.log(`📋 Headers recibidos: ${JSON.stringify(request.headers)}`);
    this.logger.log(`🔑 Authorization header: ${token?.substring(0, 50)}...`);

    if (!token) {
      this.logger.error('❌ No se proporcionó token');
      throw new UnauthorizedException('No token provided');
    }
    const cleanToken = token.replace('Bearer ', '');
    this.logger.log(`🧹 Token limpio (primeros caracteres): ${cleanToken.substring(0, 50)}...`);

    return this.validateToken(token.replace('Bearer ', ''))
      .then((decodedToken) => {
        this.logger.log('✅ Token válido');
        this.logger.log(`👤 Usuario: ${decodedToken.uid} (${decodedToken.email})`);
        // Añadir el usuario decodificado a la solicitud para uso posterior
        request['user'] = {
          firebaseUid: decodedToken.uid,
          email: decodedToken.email,
        };
        return true;
      })
      .catch((err) => {
        this.logger.error('❌ Token inválido:', err.message);
        throw new UnauthorizedException('Invalid token');
      });
  }

  private validateToken(token: string): Promise<admin.auth.DecodedIdToken> {
    return admin.auth().verifyIdToken(token);
  }
}