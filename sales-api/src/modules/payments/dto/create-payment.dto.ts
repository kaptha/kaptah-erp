import { IsNumber, IsDate, IsEnum, IsString, IsPositive, IsUUID, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePaymentDto {
  @ApiProperty({ description: 'ID de la factura o nota de venta' })
  @IsNotEmpty()
  @IsUUID()
  documentId: string;  // Cambiado de invoiceId a documentId para ser más genérico

  @ApiProperty({ description: 'Tipo de documento', enum: ['INVOICE', 'SALE_NOTE'] })
  @IsNotEmpty()
  @IsEnum(['INVOICE', 'SALE_NOTE'])
  documentType: 'INVOICE' | 'SALE_NOTE';

  @ApiProperty({ description: 'Monto del pago', minimum: 0 })
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiProperty({ description: 'Fecha del pago' })
  @IsDate()
  @Type(() => Date)
  paymentDate: Date;

  @ApiProperty({ description: 'Método de pago', enum: ['CASH', 'TRANSFER', 'CREDIT_CARD', 'DEBIT_CARD', 'CHECK'] })
  @IsEnum(['CASH', 'TRANSFER', 'CREDIT_CARD', 'DEBIT_CARD', 'CHECK'])
  paymentMethod: 'CASH' | 'TRANSFER' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'CHECK';

  @ApiProperty({ description: 'Referencia de la transacción' })
  @IsString()
  @IsNotEmpty()
  transactionReference: string;
}
