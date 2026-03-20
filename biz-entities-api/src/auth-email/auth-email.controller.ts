import { Controller, Post, Body, Logger, HttpCode } from '@nestjs/common';
import { IsEmail, IsOptional, IsString } from 'class-validator';
import { AuthEmailService } from './auth-email.service';

class SendVerificationDto {
  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  displayName?: string;
}

class SendPasswordResetDto {
  @IsEmail()
  email: string;
}

@Controller('auth-email')
export class AuthEmailController {
  private readonly logger = new Logger(AuthEmailController.name);

  constructor(private readonly authEmailService: AuthEmailService) {}

  @Post('send-verification')
  @HttpCode(200)
  async sendVerificationEmail(@Body() dto: SendVerificationDto) {
    this.logger.log(`📧 POST /auth-email/send-verification - ${dto.email}`);
    return this.authEmailService.sendVerificationEmail(dto.email, dto.displayName);
  }

  @Post('send-password-reset')
  @HttpCode(200)
  async sendPasswordResetEmail(@Body() dto: SendPasswordResetDto) {
    this.logger.log(`🔑 POST /auth-email/send-password-reset - ${dto.email}`);
    return this.authEmailService.sendPasswordResetEmail(dto.email);
  }
}