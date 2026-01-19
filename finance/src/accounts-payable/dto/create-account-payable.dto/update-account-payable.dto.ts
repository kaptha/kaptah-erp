import { IsString, IsNumber, IsOptional, IsDateString } from 'class-validator';

export class UpdateAccountPayableDto {
  @IsOptional()
  @IsString()
  providerId?: string;

  @IsString()
  @IsOptional()
  providerName?: string;

  @IsString() 
  @IsOptional()
  providerRfc?: string;

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
  notes?: string;
}


