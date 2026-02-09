import { Controller, Get, Req, Res } from '@nestjs/common';
import { AppService } from './app.service';
import { Request, Response } from 'express';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('cors-test')
  corsTest(@Req() req: Request, @Res() res: Response) {
    const origin = req.headers.origin || 'no-origin';
    
    // Configurar headers CORS manualmente
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Accept,Authorization');
    
    return res.json({
      message: 'CORS test endpoint',
      origin: origin,
      receivedHeaders: req.headers,
      method: req.method
    });
  }
}
