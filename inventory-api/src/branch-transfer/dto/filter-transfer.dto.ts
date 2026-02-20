import { IsEnum, IsInt, IsOptional, IsString, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { TransferStatus } from '../interfaces/branch-transfer.interface';

export class FilterBranchTransferDto {
  @IsString()
  userId: string;

  @IsEnum(['pending', 'in_transit', 'completed', 'cancelled'])
  @IsOptional()
  status?: TransferStatus;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  from_branch_id?: number;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  to_branch_id?: number;

  @IsDateString()
  @IsOptional()
  date_from?: string;

  @IsDateString()
  @IsOptional()
  date_to?: string;
}
