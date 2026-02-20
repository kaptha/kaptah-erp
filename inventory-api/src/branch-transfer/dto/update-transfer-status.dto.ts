import { IsEnum, IsOptional, IsString } from 'class-validator';
import { TransferStatus } from '../interfaces/branch-transfer.interface';

export class UpdateTransferStatusDto {
  @IsEnum(['pending', 'in_transit', 'completed', 'cancelled'])
  status: TransferStatus;

  @IsString()
  @IsOptional()
  approved_by?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
