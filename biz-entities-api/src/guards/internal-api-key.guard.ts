import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class InternalApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-internal-api-key'];
    
    if (!apiKey || apiKey !== process.env.INTERNAL_API_KEY) {
      throw new UnauthorizedException('API Key interna inválida');
    }
    
    return true;
  }
}
