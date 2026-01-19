import { Injectable, ExecutionContext, Logger, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);
  constructor(private reflector: Reflector) {
    super();
  }
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // ⭐ NUEVO: Verificar si la ruta es pública
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);
    
    // Si la ruta es pública, permitir acceso sin validar token
    if (isPublic) {
      this.logger.debug('🔓 Ruta pública, permitiendo acceso sin token');
      return true;
    }

    const request = context.switchToHttp().getRequest();
    
    this.logger.debug('🔐 Ruta protegida, validando token');
    this.logger.debug('Token recibido:', request.headers.authorization);

    try {
      const canActivate = await super.canActivate(context);
      this.logger.debug('canActivate result:', canActivate);
      return canActivate as boolean;
    } catch (error) {
      this.logger.error('❌ Error en canActivate:', error.message);
      throw error;
    }
  }

  handleRequest(err: any, user: any, info: any) {
    this.logger.debug('handleRequest - User:', JSON.stringify(user));
    this.logger.debug('handleRequest - Error:', err);
    this.logger.debug('handleRequest - Info:', info);

    if (err || !user) {
      throw err || new UnauthorizedException();
    }

    return user;
  }
}
