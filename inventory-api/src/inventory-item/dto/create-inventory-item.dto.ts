import { IsEnum, IsNumber, IsString, IsOptional, Min } from 'class-validator';
import { MovementType } from '../enums/movement-type.enum';

export class CreateInventoryItemDto {
  @IsNumber()
  productId: number;

  @IsEnum(MovementType)
  movementType: MovementType;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsString()
  @IsOptional()
  referenceType?: string;

  @IsString()
  @IsOptional()
  referenceId?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}