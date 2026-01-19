import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { FirebaseService } from '../firebase/firebase.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private jwtService: JwtService,
    private firebaseService: FirebaseService,
  ) {}

  async validateUser(userId: string) {
    try {
      const user = await this.firebaseService.getUser(userId);
      return {
        uid: user.uid,
        email: user.email
      };
    } catch (error) {
      return null;
    }
  }

  async login(firebaseToken: string) {
    try {
      if (!firebaseToken) {
        throw new UnauthorizedException('Token no proporcionado');
      }

      const decodedToken = await this.firebaseService.verifyToken(firebaseToken);
      const user = await this.firebaseService.getUser(decodedToken.uid);

      const [accessToken, refreshToken] = await Promise.all([
        this.generateAccessToken({ uid: user.uid, email: user.email }),
        this.generateRefreshToken({ uid: user.uid, email: user.email })
      ]);

      return {
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_in: 3600,
        user: {
          uid: user.uid,
          email: user.email
        }
      };
    } catch (error) {
      this.logger.error('Error en login:', error);
      throw new UnauthorizedException('Error de autenticación');
    }
  }

  async refreshToken(refreshToken: string) {
    try {
      const decoded = this.jwtService.verify(refreshToken);
      
      if (decoded.type !== 'refresh') {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const user = await this.firebaseService.getUser(decoded.sub);
      const accessToken = await this.generateAccessToken({ uid: user.uid, email: user.email });
      const newRefreshToken = await this.generateRefreshToken({ uid: user.uid, email: user.email });

      return {
        access_token: accessToken,
        refresh_token: newRefreshToken,
        expires_in: 3600,
        user: {
          uid: user.uid,
          email: user.email
        }
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private async generateAccessToken(payload: any): Promise<string> {
  this.logger.debug('=== GENERANDO ACCESS TOKEN ===');
  this.logger.debug('Payload para access token:', JSON.stringify(payload, null, 2));
  
  const token = this.jwtService.sign(payload, { expiresIn: '1h' });
  
  // Decodificar para verificar
  const decoded = this.jwtService.decode(token);
  this.logger.debug('Token generado decodificado:', JSON.stringify(decoded, null, 2));
  
  return token;
}

  private async generateRefreshToken(payload: any): Promise<string> {
    return this.jwtService.sign({ ...payload, type: 'refresh' }, { expiresIn: '7d' });
  }
}