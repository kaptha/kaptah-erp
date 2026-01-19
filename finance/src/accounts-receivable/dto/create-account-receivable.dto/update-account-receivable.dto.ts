import { IsString, IsNumber, IsOptional, IsDateString } from 'class-validator';

export class UpdateAccountReceivableDto {
  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  documentId?: string;

  @IsOptional()
  @IsNumber()
  totalAmount?: number;

  @IsOptional()
  @IsNumber()
  creditDays?: number;

  @IsOptional()
  @IsNumber()
  creditRemainingDays?: number;  // ✅ Campo agregado

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsDateString()
  issueDate?: string;  // ✅ Campo agregado

  @IsOptional()
  @IsString()
  notes?: string;
}
