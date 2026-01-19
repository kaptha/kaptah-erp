import { Injectable, ExecutionContext, Logger, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    
    const authHeader = request.headers.authorization;
    this.logger.debug('====== JWT AUTH GUARD ======');
    this.logger.debug('URL:', request.url);
    this.logger.debug('Method:', request.method);
    this.logger.debug('Token recibido:', authHeader ? authHeader.substring(0, 50) + '...' : 'NO HAY TOKEN');

    // Verificar que el header existe
    if (!authHeader) {
      this.logger.error('❌ No se encontró el header de autorización');
      throw new UnauthorizedException('Token no proporcionado');
    }

    // Verificar formato Bearer
    if (!authHeader.startsWith('Bearer ')) {
      this.logger.error('❌ Formato de token inválido - No comienza con Bearer');
      throw new UnauthorizedException('Formato de token inválido');
    }

    const token = authHeader.replace('Bearer ', '');
    this.logger.debug('Token extraído (primeros 20 chars):', token.substring(0, 20) + '...');

    try {
      const canActivate = await super.canActivate(context);
      this.logger.debug('✅ canActivate result:', canActivate);
      return canActivate as boolean;
    } catch (error) {
      this.logger.error('❌ Error en canActivate:');
      this.logger.error('Error name:', error.name);
      this.logger.error('Error message:', error.message);
      this.logger.error('Error stack:', error.stack);
      
      if (error.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Token expirado');
      }
      if (error.name === 'JsonWebTokenError') {
        throw new UnauthorizedException('Token inválido: ' + error.message);
      }
      if (error.name === 'NotBeforeError') {
        throw new UnauthorizedException('Token no válido todavía');
      }
      
      // Re-lanzar el error original para mantener el mensaje
      throw error;
    }
  }

  handleRequest(err: any, user: any, info: any, context: any) {
    this.logger.debug('handleRequest - User:', JSON.stringify(user));
    this.logger.debug('handleRequest - Error:', err);
    this.logger.debug('handleRequest - Info:', info);

    // Si hay un error específico de JWT
    if (err) {
      this.logger.error('❌ Error en handleRequest:', err.message || err);
      throw err;
    }

    // Si info contiene información sobre el error
    if (info) {
      this.logger.error('❌ Info en handleRequest:', info.message || info);
      
      if (info.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Token expirado - Por favor inicia sesión nuevamente');
      }
      if (info.name === 'JsonWebTokenError') {
        throw new UnauthorizedException('Token inválido - ' + (info.message || ''));
      }
      if (info.message === 'No auth token') {
        throw new UnauthorizedException('Token no proporcionado');
      }
    }

    // Si no hay usuario, el token no es válido
    if (!user) {
      this.logger.error('❌ Usuario no encontrado en el token');
      throw new UnauthorizedException('Token inválido o usuario no encontrado');
    }

    this.logger.debug('✅ Usuario autenticado correctamente:', user.email);
    return user;
  }
}