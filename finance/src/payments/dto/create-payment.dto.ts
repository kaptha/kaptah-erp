import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum PaymentMethod {
  CASH = 'CASH',
  TRANSFER = 'TRANSFER',
  CARD = 'CARD',
  CHECK = 'CHECK',
}

export class CreatePaymentDto {
  @ApiProperty({ description: 'Payment amount', example: 1000.50 })
  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @ApiProperty({ description: 'Payment method', enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  @IsNotEmpty()
  paymentMethod: PaymentMethod;

  @ApiProperty({ description: 'Payment reference', required: false })
  @IsString()
  @IsOptional()
  reference?: string;

  @ApiProperty({ description: 'Payment notes', required: false })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ description: 'Account payable ID', required: false })
  @IsUUID()
  @IsOptional()
  accountPayableId?: string;

  @ApiProperty({ description: 'Account receivable ID', required: false })
  @IsUUID()
  @IsOptional()
  accountReceivableId?: string;

  @ApiProperty({ description: 'Document reference', required: false })
  @IsString()
  @IsOptional()
  documentReference?: string;
}