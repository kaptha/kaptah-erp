import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    private configService: ConfigService
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }
  
  async validate(payload: any) {
    try {
    this.logger.debug('=== PAYLOAD COMPLETO RECIBIDO ===', JSON.stringify(payload, null, 2));
    
    if (!payload.uid) {
      this.logger.error('❌ payload.uid está vacío:', payload.uid);
      throw new UnauthorizedException('Usuario no válido');
    }

    const user = { 
      uid: payload.uid,
      email: payload.email 
    };
    
    this.logger.debug('✅ Usuario validado:', user);
    return user;
  } catch (error) {
    this.logger.error('❌ Error en validate:', error);
    throw new UnauthorizedException();
  }
  }
}