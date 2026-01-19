import { IsOptional, IsString, IsArray, ValidateNested, IsEnum } from 'class-validator';
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
}