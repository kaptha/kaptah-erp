import { IsNumber, IsDateString, IsOptional, IsString } from 'class-validator';

export class RegisterPaymentDto {
  // ✅ ELIMINAR accountId - viene por URL como parámetro

  @IsNumber()
  amount: number;

  @IsDateString()
  paymentDate: string;

  // ✅ AGREGAR campos opcionales útiles para pagos
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
