import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'inventory-api'
    };
  }

  @Get('cors-test')
  corsTest() {
    return {
      message: 'CORS is working!',
      timestamp: new Date().toISOString()
    };
  }
}
