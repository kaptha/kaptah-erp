import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class ExplicitCorsMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const origin = req.headers.origin;
    
    const allowedOrigins = [
      'http://localhost:4200',
      'http://127.0.0.1:4200',
      'https://app.kaptah.mx'
    ];
    
    if (origin && (allowedOrigins.includes(origin) || /https:\/\/.*\.vercel\.app$/.test(origin))) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Accept,Authorization,X-Firebase-Token,Origin,X-Requested-With');
      res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
    }
    
    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }
    
    next();
  }
}
