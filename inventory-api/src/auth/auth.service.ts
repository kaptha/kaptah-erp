import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as admin from 'firebase-admin';

@Injectable()
export class AuthService {
  async validateToken(token: string): Promise<admin.auth.DecodedIdToken> {
  try {
    return await admin.auth().verifyIdToken(token, false); // false = no verificar revocación
  } catch (error) {
    if (error.code === 'auth/id-token-expired') {
      // Intentar verificar sin validar expiración
      try {
        return await admin.auth().verifyIdToken(token, false);
      } catch (e) {
        throw new UnauthorizedException('Token expired');
      }
    }
    throw new UnauthorizedException('Invalid token');
  }
}
}