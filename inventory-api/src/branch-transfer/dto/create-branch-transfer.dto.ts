import { IsInt, IsString, IsOptional, IsArray, ValidateNested, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTransferItemDto {
  @IsInt()
  product_id: number;

  @IsNumber()
  @Min(0.01)
  quantity: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  cost?: number;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class CreateBranchTransferDto {
  @IsString()
  @IsOptional()
  userId?: string;

  @IsInt()
  from_branch_id: number;

  @IsInt()
  to_branch_id: number;

  @IsString()
  @IsOptional()
  requested_by?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTransferItemDto)
  items: CreateTransferItemDto[];
}
