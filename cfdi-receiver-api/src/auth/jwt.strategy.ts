import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { BadRequestException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CuentaAccessService } from './cuenta-access.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    private configService: ConfigService,
    private cuentaAccess: CuentaAccessService,
  ) {
    const secret = configService.get<string>('JWT_SECRET');

    if (!secret) {
      throw new Error('JWT_SECRET no está configurado en las variables de entorno');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
      algorithms: ['HS256'],
      passReqToCallback: true,
    });

    this.logger.log('JwtStrategy inicializada (con resolución de cuenta activa)');
  }

  /**
   * Además de validar el token, resuelve la cuenta activa:
   * header `X-Cuenta-Uid` o query `?cuentaUid=`; sin ninguno, la propia.
   * Un sub-usuario solo pasa si tiene rol en esa cuenta (403 si no).
   */
  async validate(req: any, payload: any) {
    if (!payload?.uid) {
      this.logger.error('UID no encontrado en el payload');
      throw new UnauthorizedException('Usuario no válido - UID faltante');
    }

    const solicitada = this.leerCuentaSolicitada(req);
    const { cuentaUid, rfc } = await this.cuentaAccess.resolver(payload.uid, solicitada);
    const esPropia = cuentaUid === payload.uid;

    const user = {
      uid: payload.uid,
      email: payload.email,
      cuentaUid,
      // El RFC del token es el del usuario: solo sirve si opera su propia cuenta
      rfc: rfc || (esPropia ? payload.rfc || null : null),
    };

    this.logger.debug(`Usuario ${user.uid} operando cuenta ${user.cuentaUid}${esPropia ? ' (propia)' : ''}`);
    return user;
  }

  /**
   * Si llegan header y query con cuentas distintas se rechaza: así ningún
   * controller puede terminar usando una cuenta que no se validó.
   */
  private leerCuentaSolicitada(req: any): string | undefined {
    const desdeHeader = this.primerValor(req?.headers?.['x-cuenta-uid']);
    const desdeQuery = this.primerValor(req?.query?.cuentaUid);
    if (desdeHeader && desdeQuery && desdeHeader !== desdeQuery) {
      throw new BadRequestException('X-Cuenta-Uid y ?cuentaUid indican cuentas distintas');
    }
    return desdeHeader || desdeQuery;
  }

  private primerValor(valor: any): string | undefined {
    const v = Array.isArray(valor) ? valor[0] : valor;
    return typeof v === 'string' && v.trim() ? v.trim() : undefined;
  }
}
