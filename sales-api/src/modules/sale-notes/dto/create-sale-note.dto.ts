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
  @ApiProperty({ description: 'ID del producto' })
  @IsUUID()
  productId: string;  

  @ApiProperty({ description: 'Descripción del producto' })
  @IsNotEmpty()
  @IsString()
  description: string; 

  @ApiProperty({ description: 'Cantidad del producto', minimum: 1 })
  @IsNumber()
  @IsPositive()
  quantity: number;

  @ApiProperty({ description: 'Precio unitario', minimum: 0 })
  @IsNumber()
  @IsPositive()
  unitPrice: number;

  @ApiProperty({ description: 'Lista de impuestos aplicados', required: false, type: [TaxItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TaxItemDto)
  taxes?: TaxItemDto[];
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
  // 👇 AGREGAR ESTAS PROPIEDADES
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

  @ApiProperty({ description: 'Lista de productos' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSaleNoteItemDto)
  items: CreateSaleNoteItemDto[];

  @ApiProperty({ description: 'Método de pago', enum: ['CASH', 'CARD', 'TRANSFER'] })
  @IsEnum(['CASH', 'CARD', 'TRANSFER'])  
  paymentMethod: 'CASH' | 'CARD' | 'TRANSFER';
}
