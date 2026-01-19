import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(private configService: ConfigService) {
    const secret = configService.get<string>('JWT_SECRET');
    
    if (!secret) {
      throw new Error('JWT_SECRET no está configurado en las variables de entorno');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
      algorithms: ['HS256']
    });

    this.logger.log('=== JWT STRATEGY INITIALIZATION ===');
    this.logger.log('JwtStrategy inicializada correctamente');
  }

  async validate(payload: any) {
    this.logger.debug('=== JWT VALIDATE ===');
    this.logger.debug('Payload completo:', JSON.stringify(payload, null, 2));

    try {
      if (!payload) {
        this.logger.error('Payload vacío');
        throw new UnauthorizedException('Token inválido');
      }

      if (!payload.uid) {
        this.logger.error('UID no encontrado en el payload');
        throw new UnauthorizedException('Usuario no válido - UID faltante');
      }

      // ✅ CAMBIO: Incluir RFC en el objeto user
      const user = { 
        uid: payload.uid,
        email: payload.email,
        rfc: payload.rfc || null  // ✅ Agregar RFC del payload
      };

      this.logger.debug('Usuario validado:', JSON.stringify(user, null, 2));
      
      // ✅ Log específico para RFC
      if (user.rfc) {
        this.logger.debug(`✅ RFC del usuario: ${user.rfc}`);
      } else {
        this.logger.warn('⚠️ RFC no encontrado en el token');
      }

      return user;
    } catch (error) {
      this.logger.error('Error en validate:', error.message || error);
      throw new UnauthorizedException('Error en la validación del token');
    }
  }
}