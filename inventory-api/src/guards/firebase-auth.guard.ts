import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Observable } from 'rxjs';
import * as admin from 'firebase-admin';
import { FirebaseUser } from '../interfaces/firebase-user.interface';
import { AuthService } from '../auth/auth.service';
declare global {
  namespace Express {
    interface Request {
      user?: FirebaseUser;
    }
  }
}

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  constructor(private authService: AuthService) {}

  canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = request.headers.authorization;

    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    return this.authService.validateToken(token.replace('Bearer ', ''))
      .then((decodedToken) => {
        request.user = {
          firebaseUid: decodedToken.uid,
          email: decodedToken.email,
        };
        return true;
      })
      .catch((error) => {
        throw new UnauthorizedException(`Invalid token: ${error.message}`);
      });
  }
}
