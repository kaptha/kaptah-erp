import { 
  IsNotEmpty, 
  IsNumber, 
  IsString, 
  IsOptional, 
  IsDateString,
  IsEnum,
  IsArray,
  ValidateNested,
  Min,
  ArrayMinSize
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
//import { PurchaseOrderStatus } from '../entities/purchase-order.entity';
import { PurchaseOrderStatus } from '../enums/purchase-order-status.enum';

export class CreatePurchaseOrderItemDto {
  @ApiProperty({ example: 1 })
  @IsNotEmpty()
  @IsNumber()
  productId: number;

  @ApiProperty({ example: 10 })
  @IsNotEmpty()
  @IsNumber()
  @Min(0.01)
  quantity: number;

  @ApiProperty({ example: 150.50 })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  unitCost: number;

  @ApiPropertyOptional({ example: 16 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  taxRate?: number;

  @ApiPropertyOptional({ example: 'Notas del item' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreatePurchaseOrderDto {
  @ApiProperty({ example: 1 })
  @IsNotEmpty()
  @IsNumber()
  supplierId: number;

  @ApiPropertyOptional({ example: '2025-11-27' })
  @IsOptional()
  @IsDateString()
  orderDate?: string;

  @ApiPropertyOptional({ example: '2025-12-05' })
  @IsOptional()
  @IsDateString()
  expectedDate?: string;

  @ApiPropertyOptional({ example: 'MXN' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ example: 'Notas de la orden' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ example: PurchaseOrderStatus.DRAFT })
  @IsOptional()
  @IsEnum(PurchaseOrderStatus)
  status?: PurchaseOrderStatus;

  @ApiProperty({ type: [CreatePurchaseOrderItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreatePurchaseOrderItemDto)
  items: CreatePurchaseOrderItemDto[];
}