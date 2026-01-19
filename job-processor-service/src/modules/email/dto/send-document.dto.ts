import {
  IsEmail,
  IsString,
  IsOptional,
  IsEnum,
  IsObject,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum DocumentType {
  INVOICE = 'invoice',
  QUOTATION = 'quotation',
  DELIVERY_NOTE = 'delivery_note',
  PAYMENT_REMINDER = 'payment_reminder',
  SALE_ORDER = 'sale_order',
  PURCHASE_ORDER = 'purchase_order',
}

class AttachmentDto {
  @IsString()
  filename: string;

  @IsString()
  content: string; // base64

  @IsString()
  contentType: string;
}

export class SendDocumentDto {
  @IsString()
  userId: string;

  @IsString()
  organizationId: string;

  @IsEmail()
  recipient: string;

  @IsEnum(DocumentType)
  documentType: DocumentType;

  @IsString()
  documentId: string;

  @IsOptional()
  @IsString()
  recipientName?: string;

  @IsOptional()
  @IsString()
  customMessage?: string;

  @IsObject()
  documentData: {
    folio: string;
    date: string;
    total: number;
    currency: string;
    items?: any[];
    clientName?: string;
    clientRFC?: string;
    [key: string]: any;
  };

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttachmentDto)
  attachments?: AttachmentDto[];

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}