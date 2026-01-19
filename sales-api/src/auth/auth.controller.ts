import { Controller, Post, Body, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body('firebaseToken') firebaseToken: string) {
    this.logger.log('📥 Login request recibido');
    const result = await this.authService.login(firebaseToken);
    this.logger.log('✅ Login exitoso para:', result.user.email);
    return result;
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body('refresh_token') refreshToken: string) {
    this.logger.log('📥 Refresh token request recibido');
    const result = await this.authService.refreshToken(refreshToken);
    this.logger.log('✅ Token refrescado exitosamente para:', result.user.email);
    return result;
  }

  @Post('convert')
  @HttpCode(HttpStatus.OK)
  async convertToJWT(@Body('idToken') idToken: string) {
    this.logger.log('📥 Convert Firebase token request recibido');
    const result = await this.authService.convertToJWT(idToken);
    this.logger.log('✅ Token convertido exitosamente para:', result.user.email);
    return result;
  }
}