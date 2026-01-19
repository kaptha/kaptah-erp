// auth.service.ts en sales-api
import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { FirebaseService } from '../firebase/firebase.service';
import { firstValueFrom } from 'rxjs';  // ✅ Agregar
import { UsuariosService } from 'src/modules/usuarios/usuarios.service';
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly bizEntitiesApiUrl = 'http://localhost:3000';  // ✅ URL de biz-entities-api

  constructor(
    private jwtService: JwtService,
    private firebaseService: FirebaseService,
    private configService: ConfigService,
    private usuariosService: UsuariosService,
  ) {}

 /**
   * Obtener RFC del usuario desde MySQL directamente
   */
  private async getRfcFromMySQL(firebaseUid: string): Promise<string | null> {
    try {
      this.logger.debug('🔍 Consultando RFC en MySQL...');
      this.logger.debug('Firebase UID:', firebaseUid);
      
      const usuario = await this.usuariosService.findByFirebaseUid(firebaseUid);
      
      if (usuario && usuario.rfc) {
        this.logger.debug('✅ RFC obtenido:', usuario.rfc);
        return usuario.rfc;
      } else {
        this.logger.warn('⚠️ Usuario encontrado pero sin RFC');
        return null;
      }
    } catch (error) {
      this.logger.error('❌ Error consultando MySQL:', error.message);
      return null;
    }
  }

  async validateUser(userId: string) {
    try {
      const user = await this.firebaseService.getUser(userId);
      const rfc = await this.getRfcFromMySQL(user.uid);
      
      return {
        uid: user.uid,
        email: user.email,
        rfc: rfc
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

      this.logger.debug('=== LOGIN ===');
      this.logger.debug('Firebase UID:', user.uid);
      this.logger.debug('Email:', user.email);

      // ✅ Obtener RFC desde MySQL directamente
      const rfc = await this.getRfcFromMySQL(user.uid);

      const payload = {
        uid: user.uid,
        email: user.email,
        rfc: rfc
      };

      const [accessToken, refreshToken] = await Promise.all([
        this.generateAccessToken(payload),
        this.generateRefreshToken(payload)
      ]);

      return {
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_in: 3600,
        user: {
          uid: user.uid,
          email: user.email,
          rfc: rfc
        }
      };
    } catch (error) {
      this.logger.error('Error en login:', error);
      throw new UnauthorizedException('Error de autenticación');
    }
  }

  async refreshToken(refreshToken: string) {
    try {
      this.logger.debug('=== REFRESH TOKEN REQUEST ===');
      
      if (!refreshToken) {
        throw new UnauthorizedException('Refresh token no proporcionado');
      }

      const decoded = this.jwtService.verify(refreshToken);
      
      if (decoded.type !== 'refresh') {
        throw new UnauthorizedException('Token de refresco inválido');
      }

      const user = await this.firebaseService.getUser(decoded.uid);
      
      // ✅ Obtener RFC actualizado desde MySQL
      const rfc = await this.getRfcFromMySQL(user.uid);

      const payload = {
        uid: user.uid,
        email: user.email,
        rfc: rfc
      };

      const accessToken = await this.generateAccessToken(payload);
      const newRefreshToken = await this.generateRefreshToken(payload);

      return {
        access_token: accessToken,
        refresh_token: newRefreshToken,
        expires_in: 3600,
        user: {
          uid: user.uid,
          email: user.email,
          rfc: rfc
        }
      };
    } catch (error) {
      this.logger.error('❌ Error en refreshToken:', error.message);
      throw new UnauthorizedException('Error al refrescar token');
    }
  }

  async convertToJWT(firebaseIdToken: string) {
    try {
      this.logger.debug('=== CONVERT FIREBASE TOKEN TO JWT ===');
      
      if (!firebaseIdToken) {
        throw new UnauthorizedException('Firebase token no proporcionado');
      }

      const decodedToken = await this.firebaseService.verifyToken(firebaseIdToken);
      const user = await this.firebaseService.getUser(decodedToken.uid);

      // ✅ Obtener RFC desde MySQL
      const rfc = await this.getRfcFromMySQL(user.uid);

      const payload = {
        uid: user.uid,
        email: user.email,
        rfc: rfc
      };

      const [accessToken, refreshToken] = await Promise.all([
        this.generateAccessToken(payload),
        this.generateRefreshToken(payload)
      ]);

      return {
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_in: 3600,
        user: {
          uid: user.uid,
          email: user.email,
          rfc: rfc
        }
      };
    } catch (error) {
      this.logger.error('❌ Error en convertToJWT:', error.message);
      throw new UnauthorizedException('Error al convertir Firebase token');
    }
  }

  private async generateAccessToken(payload: any): Promise<string> {
    this.logger.debug('=== GENERANDO ACCESS TOKEN ===');
    this.logger.debug('Payload completo:', JSON.stringify(payload, null, 2));
    
    if (!payload.rfc) {
      this.logger.warn('⚠️ RFC no presente en el payload');
    } else {
      this.logger.debug('✅ RFC incluido en token:', payload.rfc);
    }
    
    const token = this.jwtService.sign(payload, { expiresIn: '8h' });
    
    const decoded = this.jwtService.decode(token);
    this.logger.debug('Token generado:', JSON.stringify(decoded, null, 2));
    
    return token;
  }

  private async generateRefreshToken(payload: any): Promise<string> {
    return this.jwtService.sign({ ...payload, type: 'refresh' }, { expiresIn: '7d' });
  }
}