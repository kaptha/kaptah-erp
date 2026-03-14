import { IsString, IsUUID, IsNumber, IsArray, ValidateNested, IsEnum, IsPositive, IsNotEmpty, IsOptional, IsBoolean, IsEmail } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class TaxItemDto {
  @ApiProperty({ description: 'ID del impuesto' })
  @IsNumber()
  taxId: number;

  @ApiProperty({ description: 'Nombre del impuesto (ej: IVA)' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Tasa del impuesto (ej: 0.16)' })
  @IsString()
  rate: string;

  @ApiProperty({ description: 'Monto del impuesto' })
  @IsNumber()
  amount: number;
}

export class CreateSaleNoteItemDto {
  @IsOptional()
  @IsString()
  productId?: string;        

  @IsOptional()
  @IsString()
  itemId?: string;           

  @IsOptional()
  @IsString()
  type?: string;             

  @IsNotEmpty()
  @IsString()
  description: string;

  @IsNumber()
  @IsPositive()
  quantity: number;

  @IsNumber()
  @IsPositive()
  unitPrice: number;

  @IsOptional()
  @IsNumber()
  subtotal?: number;

  @IsOptional()
  @IsNumber()
  taxesTotal?: number;

  @IsOptional()
  @IsNumber()
  total?: number;

  @IsOptional()
  @IsArray()
  taxes?: any[];             
}

export class CreateSaleNoteDto {
  @ApiProperty({ description: 'Nombre del cliente' })
  @IsNotEmpty()
  @IsString()
  customerName: string;  

  @ApiProperty({ description: 'RFC del cliente' })
  @IsNotEmpty()
  @IsString()
  customerRfc: string;

  @ApiProperty({ description: 'ID de la sucursal', required: false })
  @IsOptional()
  @IsNumber()
  sucursalId?: number;
 
  @IsBoolean()
  @IsOptional()
  afectaInventario?: boolean;

  @IsString()
  @IsOptional()
  almacenId?: string;

  @IsBoolean()
  @IsOptional()
  enviarEmail?: boolean;

  @IsEmail()
  @IsOptional()
  clienteEmail?: string;

  @IsOptional()
  @IsString()
  observaciones?: string;

  @ApiProperty({ description: 'Lista de productos' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSaleNoteItemDto)
  items: CreateSaleNoteItemDto[];

  @ApiProperty({ description: 'Método de pago', enum: ['CASH', 'CARD', 'TRANSFER'] })
  @IsEnum(['CASH', 'CARD', 'TRANSFER'])  
  paymentMethod: 'CASH' | 'CARD' | 'TRANSFER';
}
