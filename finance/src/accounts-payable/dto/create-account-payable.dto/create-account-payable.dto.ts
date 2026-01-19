import { IsInt, IsString, IsNumber, IsDateString, IsOptional } from 'class-validator';

export class CreateAccountPayableDto {
   @IsInt()
  partnerId: number;

   @IsInt()
  providerId: number;

  @IsString()
  providerName: string;  

  @IsString() 
  providerRfc: string;

  @IsNumber()
  totalAmount: number;

  @IsNumber()
  creditDays: number;

  @IsDateString()
  dueDate: string;

  @IsDateString()
  @IsOptional()
  issueDate?: string; 

  
  @IsOptional()
  documentId?: string;

  @IsOptional()
  @IsString()
  documentNumber?: string;

  @IsOptional()
  @IsString()
  documentType?: string;

  @IsOptional()
  @IsString()
  documentReference?: string;

  @IsString()
  concept: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

