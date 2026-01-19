import { Injectable, OnModuleInit, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseService implements OnModuleInit {
  private firebaseApp: admin.app.App;
  private readonly logger = new Logger(FirebaseService.name);

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const firebaseConfig = this.configService.get('firebase');
    
    if (!this.firebaseApp) {
      this.firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(firebaseConfig as admin.ServiceAccount),
      });
    }
  }

  async verifyToken(token: string): Promise<admin.auth.DecodedIdToken> {
    if (!token) {
      this.logger.error('Token no proporcionado');
      throw new UnauthorizedException('Token no proporcionado');
    }

    try {
      this.logger.debug('Token recibido:', token);
      return await this.firebaseApp.auth().verifyIdToken(token);
    } catch (error) {
      this.logger.error('Error verificando token:', error);
      throw error;
    }
  }

  async getUser(uid: string): Promise<admin.auth.UserRecord> {
    if (!uid) {
      throw new UnauthorizedException('UID no proporcionado');
    }

    try {
      return await this.firebaseApp.auth().getUser(uid);
    } catch (error) {
      this.logger.error('Error obteniendo usuario:', error);
      throw error;
    }
  }
}
