import { IsString, IsEmail, IsNumber, IsArray, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class QuotationItemDto {
  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  details?: string;

  @IsNumber()
  quantity: number;

  @IsNumber()
  unitPrice: number;

  @IsNumber()
  total: number;
}

export class SendQuotationEmailDto {
  @IsString()
  userId: string;

  @IsString()
  organizationId: string;

  @IsEmail()
  recipientEmail: string;

  @IsString()
  quotationId: string;

  @IsString()
  folio: string;

  @IsString()
  date: string;

  @IsNumber()
  total: number;

  @IsNumber()
  subtotal: number;

  @IsNumber()
  tax: number;

  @IsOptional()
  @IsNumber()
  taxRate?: number;

  @IsString()
  currency: string;

  @IsString()
  clientName: string;

  @IsOptional()
  @IsString()
  validUntil?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuotationItemDto)
  items: QuotationItemDto[];

  @IsOptional()
  @IsString()
  terms?: string;

  @IsOptional()
  @IsString()
  customMessage?: string;

  @IsOptional()
  @IsString()
  pdfBase64?: string;
}