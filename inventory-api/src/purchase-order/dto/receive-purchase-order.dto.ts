import { 
  IsNotEmpty, 
  IsNumber, 
  IsArray,
  ValidateNested,
  Min,
  ArrayMinSize,
  IsOptional,
  IsString
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ReceiveOrderItemDto {
  @ApiProperty({ example: 1 })
  @IsNotEmpty()
  @IsNumber()
  purchaseOrderItemId: number;

  @ApiProperty({ example: 10 })
  @IsNotEmpty()
  @IsNumber()
  @Min(0.01)
  quantityReceived: number;

  @ApiPropertyOptional({ example: 'Item en perfectas condiciones' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class ReceivePurchaseOrderDto {
  @ApiProperty({ type: [ReceiveOrderItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ReceiveOrderItemDto)
  items: ReceiveOrderItemDto[];

  @ApiPropertyOptional({ example: 'Recepción completa sin observaciones' })
  @IsOptional()
  @IsString()
  notes?: string;
}