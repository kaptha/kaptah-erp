import { IsOptional, IsNumber, IsDate, IsEnum, IsString, IsPositive } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdatePaymentDto {
  @ApiPropertyOptional({ description: 'Monto del pago', minimum: 0 })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  amount?: number;

  @ApiPropertyOptional({ description: 'Fecha del pago' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  paymentDate?: Date;

  @ApiPropertyOptional({ description: 'Método de pago', enum: ['CASH', 'TRANSFER', 'CREDIT_CARD', 'DEBIT_CARD', 'CHECK'] })
  @IsOptional()
  @IsEnum(['CASH', 'TRANSFER', 'CREDIT_CARD', 'DEBIT_CARD', 'CHECK'])
  paymentMethod?: 'CASH' | 'TRANSFER' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'CHECK';

  @ApiPropertyOptional({ description: 'Referencia de la transacción' })
  @IsOptional()
  @IsString()
  transactionReference?: string;
}
