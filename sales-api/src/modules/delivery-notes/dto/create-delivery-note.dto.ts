import { Type } from 'class-transformer';
import { IsNotEmpty, IsUUID, IsArray, ValidateNested, IsNumber, Min, IsString, IsOptional, IsBoolean, IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DeliveryNoteItemDto {
  @ApiProperty({ description: 'ID del producto' })
  @IsNotEmpty()
  @IsString()
  productId: string;

  @ApiProperty({ description: 'Cantidad del producto', minimum: 1 })
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty({ description: 'Descripción del producto' })
  @IsNotEmpty()
  @IsString()
  description: string;

  @ApiProperty({ description: 'Cantidad entregada', minimum: 0, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  deliveredQuantity?: number;
}

export class CreateDeliveryNoteDto {
  @ApiProperty({ description: 'ID de la orden de venta relacionada' })
  @IsNotEmpty()
  @IsUUID()
  salesOrderId: string;

  @IsNumber()
  @IsOptional()
  sucursalId?: number;

  @ApiProperty({ type: [DeliveryNoteItemDto], description: 'Lista de productos a entregar' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DeliveryNoteItemDto)
  items: DeliveryNoteItemDto[];

  // 👇 AGREGAR: Campos nuevos
  @ApiProperty({ description: 'Afectar inventario automáticamente', required: false, default: true })
  @IsOptional()
  @IsBoolean()
  afectarInventario?: boolean;

  @ApiProperty({ description: 'ID del almacén', required: false })
  @IsOptional()
  @IsString()
  almacenId?: string;

  @ApiProperty({ description: 'Enviar email al cliente', required: false, default: false })
  @IsOptional()
  @IsBoolean()
  enviarEmail?: boolean;

  @ApiProperty({ description: 'Email del cliente', required: false })
  @IsOptional()
  @IsEmail()
  clienteEmail?: string;

  @ApiProperty({ description: 'Notas de entrega', required: false })
  @IsOptional()
  @IsString()
  notasEntrega?: string;
}

