import { IsString, IsEmail, IsNumber, IsOptional } from 'class-validator';

export class SendPaymentReminderDto {
  @IsEmail()
  recipientEmail: string;

  @IsOptional()
  @IsString()
  customMessage?: string;
}