import { IsString, IsEmail, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendPurchaseOrderEmailDto {
  @ApiProperty({ description: 'Email del proveedor' })
  @IsEmail()
  recipientEmail: string;

  @ApiProperty({ description: 'Mensaje personalizado', required: false })
  @IsOptional()
  @IsString()
  customMessage?: string;
}