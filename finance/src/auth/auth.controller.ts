import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto, RefreshTokenDto, AuthResponseDto } from './dto/auth.dto';
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() loginDto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(loginDto.firebaseToken);
  }

  @Post('refresh')
  async refresh(@Body() refreshDto: RefreshTokenDto): Promise<AuthResponseDto> {
    return this.authService.refreshToken(refreshDto.refresh_token);
  }
}