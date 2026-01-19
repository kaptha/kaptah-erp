import { IsInt, IsString, IsNumber, IsDateString, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer'; // ✅ AGREGAR ESTE IMPORT

export class CreateAccountReceivableDto {

  @IsOptional()
  @IsInt()
  partnerId: number;

  @IsInt()
  @Transform(({ value }) => parseInt(value)) // ✅ Ahora funcionará
  customerId: number;

  @IsString()
  customerName: string;

  @IsString()
  customerRfc: string;

  @IsNumber()
  @Transform(({ value }) => parseFloat(value)) // ✅ Para manejar decimales
  totalAmount: number;

  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  creditDays: number;

  @IsDateString()
  dueDate: string;

  @IsOptional()
  @IsDateString()
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

