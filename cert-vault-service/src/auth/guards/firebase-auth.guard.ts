import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { FirebaseAdminConfig } from '../firebase-admin.config';

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  constructor(private firebaseAdmin: FirebaseAdminConfig) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    if (request.method === 'OPTIONS') {
      return true;
    }

    const authHeader = request.headers.authorization;
    console.log('🔐 Guard - Method:', request.method);
    console.log('🔐 Guard - Path:', request.path);
    console.log('🔐 Guard - Auth header present:', !!authHeader);
    console.log('🔐 Guard - Token preview:', authHeader?.substring(0, 50));

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('🔐 Guard - No token provided');
      throw new UnauthorizedException('No token provided');
    }

    const token = authHeader.split('Bearer ')[1];
    console.log('🔐 Guard - Token length:', token.length);

    try {
      const decodedToken = await this.firebaseAdmin.getAuth().verifyIdToken(token);
      console.log('🔐 Guard - Token verified! UID:', decodedToken.uid);
      request.user = {
        id: decodedToken.uid,
        email: decodedToken.email,
      };
      return true;
    } catch (error) {
      console.log('🔐 Guard - Token verification FAILED:', error.message);
      throw new UnauthorizedException('Invalid token');
    }
  }
}
