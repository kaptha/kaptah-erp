import { IsOptional, IsArray, ValidateNested, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { DeliveryNoteItemDto } from './create-delivery-note.dto'; // ✅ Importar

export class UpdateDeliveryNoteDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DeliveryNoteItemDto)
  items?: DeliveryNoteItemDto[];

  @IsOptional()
  @IsString()
  status?: 'PENDING' | 'TRANSIT' | 'DELIVERED' | 'CANCELLED'; // ✅ Agregar TRANSIT

  @IsOptional()
  @IsString()
  notes?: string;
}