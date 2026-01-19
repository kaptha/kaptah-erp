import { IsString, IsEmail, IsNumber, IsArray, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
class InvoiceItemDto {
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

export class SendInvoiceEmailDto {
  @IsString()
  userId: string;

  @IsString()
  organizationId: string;

  @IsEmail()
  recipientEmail: string;

  @IsString()
  cfdiId: string;

  @IsString()
  folio: string;

  @IsOptional()
  @IsString()
  serie?: string;

  @IsString()
  uuid: string;

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

  @IsString()
  clientRFC: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvoiceItemDto)
  items: InvoiceItemDto[];

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  customMessage?: string;

  @IsOptional()
  @IsString()
  pdfBase64?: string; // PDF en base64

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  pdfStyle?: string;

  @ApiProperty({ required: false, description: 'URL del logo de la empresa' })
  @IsOptional()
  @IsString()
  companyLogo?: string;
}