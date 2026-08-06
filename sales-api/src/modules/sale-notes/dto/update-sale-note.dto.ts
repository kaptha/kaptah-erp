import { IsOptional, IsString, IsArray, ValidateNested, IsEnum, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CreateSaleNoteItemDto } from './create-sale-note.dto';

export class UpdateSaleNoteDto {
  @ApiPropertyOptional({ description: 'Nombre del cliente' })
  @IsOptional()
  @IsString()
  customerName?: string;

  @ApiPropertyOptional({ description: 'RFC del cliente' })
  @IsOptional()
  @IsString()
  customerRfc?: string;

  @ApiPropertyOptional({ description: 'Lista de productos' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSaleNoteItemDto)
  items?: CreateSaleNoteItemDto[];

  @ApiPropertyOptional({ description: 'Método de pago', enum: ['CASH', 'CARD', 'TRANSFER'] })
  @IsOptional()
  @IsEnum(['CASH', 'CARD', 'TRANSFER'])
  paymentMethod?: 'CASH' | 'CARD' | 'TRANSFER';

  @ApiPropertyOptional({ description: 'Direccion del cliente' })
  @IsOptional()
  @IsString()
  customerAddress?: string;

  @ApiPropertyOptional({ description: 'ID de la sucursal' })
  @IsOptional()
  sucursalId?: number | null;

  @ApiPropertyOptional({ description: 'Fecha de venta' })
  @IsOptional()
  saleDate?: Date;

  @ApiPropertyOptional({ description: 'Estado de la nota' })
  @IsOptional()
  @IsEnum(['COMPLETED', 'CANCELLED', 'PENDING'])
  status?: string;

  @ApiPropertyOptional({ description: 'Observaciones' })
  @IsOptional()
  @IsString()
  observaciones?: string;

  @ApiPropertyOptional({ description: 'Subtotal' })
  @IsOptional()
  @IsNumber()
  subtotal?: number;

  @ApiPropertyOptional({ description: 'Total de impuestos' })
  @IsOptional()
  @IsNumber()
  taxesTotal?: number;

  @ApiPropertyOptional({ description: 'Total' })
  @IsOptional()
  @IsNumber()
  total?: number;
}