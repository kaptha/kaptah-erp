import { IsNumber, IsDateString, IsOptional, IsString } from 'class-validator';

export class RegisterPaymentDto {
 
  @IsNumber()
  amount: number;

  @IsDateString()
  paymentDate: string;

  // ✅ AGREGAR campos opcionales que podrían ser útiles
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}