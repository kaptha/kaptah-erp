import { Injectable, ExecutionContext, Logger, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    
    this.logger.debug('Token recibido:', request.headers.authorization);

    try {
      const canActivate = await super.canActivate(context);
      this.logger.debug('canActivate result:', canActivate);
      return canActivate as boolean;
    } catch (error) {
      this.logger.error('Error en canActivate:', error);
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