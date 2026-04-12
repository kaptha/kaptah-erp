import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class InternalApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-internal-api-key'];
    const validKey = process.env.INTERNAL_API_KEY;

    if (!validKey) {
      throw new UnauthorizedException('INTERNAL_API_KEY no configurada en el servidor');
    }

    if (!apiKey || apiKey !== validKey) {
      throw new UnauthorizedException('API key interna invalida');
    }

    return true;
  }
}
