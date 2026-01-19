import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class FirebaseTokenMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      // ⭐ Guardar el token ORIGINAL antes de que ningún guard lo procese
      (req as any).originalFirebaseToken = token;
      console.log('💾 [Middleware] Token Firebase guardado:', token.substring(0, 50) + '...');
    }
    
    next();
  }
}