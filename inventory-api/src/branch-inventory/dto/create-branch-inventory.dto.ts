import { IsInt, IsNumber, IsString, IsOptional, Min } from 'class-validator';

export class CreateBranchInventoryDto {
  @IsString()
  userId: string;

  @IsInt()
  branch_id: number;

  @IsInt()
  product_id: number;

  @IsNumber()
  @Min(0)
  quantity: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  min_stock?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  max_stock?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  cost?: number;
}
