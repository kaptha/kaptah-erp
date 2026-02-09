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
    const response = context.switchToHttp().getResponse();
    
    // Configurar headers CORS explícitamente
    const origin = request.headers.origin;
    const allowedOrigins = [
      'http://localhost:4200',
      'http://127.0.0.1:4200',
      'https://app.kaptah.mx'
    ];
    
    if (origin && (allowedOrigins.includes(origin) || /https:\/\/.*\.vercel\.app$/.test(origin))) {
      response.setHeader('Access-Control-Allow-Origin', origin);
      response.setHeader('Access-Control-Allow-Credentials', 'true');
      response.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
      response.setHeader('Access-Control-Allow-Headers', 'Content-Type,Accept,Authorization,X-Firebase-Token,Origin,X-Requested-With');
      response.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
    }
    
    // Permitir preflight requests (CORS)
    if (request.method === 'OPTIONS') {
      return Promise.resolve(true);
    }
    
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
