import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(private configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      this.logger.warn('No authorization header found');
      throw new UnauthorizedException('No authorization token provided');
    }

    const [type, token] = authHeader.split(' ');

    if (type !== 'Bearer' || !token) {
      this.logger.warn('Invalid authorization format');
      throw new UnauthorizedException('Invalid authorization format');
    }

    try {
      const secret = this.configService.get<string>('jwt.secret');
      const decoded = jwt.verify(token, secret);

      request.user = decoded;

      return true;
    } catch (error) {
      this.logger.error(`JWT verification failed: ${error.message}`);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}