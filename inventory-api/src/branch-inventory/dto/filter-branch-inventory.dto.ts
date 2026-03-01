import { IsInt, IsOptional, IsString, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export type StockStatus = 'ok' | 'low' | 'critical' | 'out';

export class FilterBranchInventoryDto {
  @IsString()
  @IsOptional()  
  userId?: string;  

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  branch_id?: number;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  product_id?: number;

  @IsEnum(['ok', 'low', 'critical', 'out'])
  @IsOptional()
  stock_status?: StockStatus;

  @IsOptional()
  search?: string;
}
