import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { FirebaseAdminConfig } from '../firebase-admin.config';

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  constructor(private firebaseAdmin: FirebaseAdminConfig) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ Token no válido o no presente');
      throw new UnauthorizedException('No token provided');
    }

    const token = authHeader.split('Bearer ')[1];

    try {
      const decodedToken = await this.firebaseAdmin.getAuth().verifyIdToken(token);
      request.user = {
        id: decodedToken.uid,
        email: decodedToken.email,
        // otros campos que necesites
      };
      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }
}