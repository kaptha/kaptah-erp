import { IsNumber, IsOptional, Min } from 'class-validator';

export class UpdateBranchInventoryDto {
  @IsNumber()
  @Min(0)
  @IsOptional()
  quantity?: number;

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
