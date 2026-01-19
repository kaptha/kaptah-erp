import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as admin from 'firebase-admin';

@Injectable()
export class AuthService {
  async validateToken(token: string): Promise<admin.auth.DecodedIdToken> {
    try {
      return await admin.auth().verifyIdToken(token);
    } catch (error) {
      if (error.code === 'auth/id-token-expired') {
        throw new UnauthorizedException('Token expired');
      }
      throw new UnauthorizedException('Invalid token');
    }
  }

  async getUserByToken(token: string): Promise<admin.auth.DecodedIdToken> {
    return this.validateToken(token);
  }
}