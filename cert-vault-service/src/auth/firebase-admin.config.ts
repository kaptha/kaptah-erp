import { Injectable } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FirebaseAdminConfig {
  constructor(private configService: ConfigService) {
    if (!admin.apps.length) {
      const projectId = configService.get('FIREBASE_PROJECT_ID');
      const clientEmail = configService.get('FIREBASE_CLIENT_EMAIL');
      const privateKey = configService.get('FIREBASE_PRIVATE_KEY')?.replace(/\\n/g, '\n');
      
      console.log('🔑 Firebase Admin Init:');
      console.log('  Project ID:', projectId);
      console.log('  Client Email:', clientEmail);
      console.log('  Private Key starts with:', privateKey?.substring(0, 30));
      console.log('  Private Key ends with:', privateKey?.substring(privateKey.length - 30));
      console.log('  Private Key contains real newlines:', privateKey?.includes('\n'));
      
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
    }
  }

  getAuth() {
    return admin.auth();
  }
}