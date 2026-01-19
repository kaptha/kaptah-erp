import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

export enum DocumentType {
  INVOICE = 'invoice',
  DELIVERY = 'delivery',
  QUOTE = 'quote'
}

export class SaveDesignSettingDto {
  @IsEnum(DocumentType)
  @IsNotEmpty()
  type: DocumentType;

  @IsString()
  @IsNotEmpty()
  designId: string;
}