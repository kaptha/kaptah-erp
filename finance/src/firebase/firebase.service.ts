import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseService.name);

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    // Inicializar Firebase Admin SDK
    if (!admin.apps.length) {
      const serviceAccount = {
        projectId: this.configService.get('FIREBASE_PROJECT_ID'),
        privateKey: this.configService.get('FIREBASE_PRIVATE_KEY')?.replace(/\\n/g, '\n'),
        clientEmail: this.configService.get('FIREBASE_CLIENT_EMAIL'),
      };

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    }
    
    this.logger.log('✅ Firebase Admin SDK initialized successfully');
  }

  async verifyToken(token: string): Promise<any> {
    try {
      this.logger.debug(`Verifying token: ${token?.substring(0, 10)}...`);
      
      // Verificar el token real con Firebase
      const decodedToken = await admin.auth().verifyIdToken(token);
      
      this.logger.debug('Token verified successfully:', {
        uid: decodedToken.uid,
        email: decodedToken.email
      });
      
      return decodedToken;
    } catch (error) {
      this.logger.error('Error verifying token:', error);
      throw error;
    }
  }

  async getUser(uid: string): Promise<any> {
    try {
      this.logger.debug(`Getting user: ${uid}`);
      
      // Obtener el usuario real de Firebase
      const userRecord = await admin.auth().getUser(uid);
      
      return {
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName,
      };
    } catch (error) {
      this.logger.error('Error getting user:', error);
      throw error;
    }
  }
}
