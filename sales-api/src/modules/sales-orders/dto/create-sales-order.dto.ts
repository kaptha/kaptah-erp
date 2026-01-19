import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsArray, ValidateNested, IsUUID, IsNumber, IsOptional, IsBoolean, IsEmail } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateSalesOrderItemDto {
  @ApiProperty({ description: 'ID del producto' })
  @IsUUID()
  productId: string;

  @ApiProperty({ description: 'Descripción del producto' })
  @IsNotEmpty()
  @IsString()
  description: string;

  @ApiProperty({ description: 'Cantidad del producto', minimum: 1 })
  @IsNotEmpty()
  quantity: number;

  @ApiProperty({ description: 'Precio unitario', minimum: 0 })
  @IsNotEmpty()
  unitPrice: number;
}

export class CreateSalesOrderDto {
  @ApiProperty({ description: 'Nombre del cliente' })
  @IsNotEmpty()
  @IsString()
  customerName: string;

  @ApiProperty({ description: 'Dirección del cliente', required: false })
  @IsString()
  customerAddress: string;

  @ApiProperty({ description: 'RFC del cliente', maxLength: 13 })
  @IsNotEmpty()
  @IsString()
  customerRfc: string;

  // ✨ NUEVO: Campo para sucursal
  @ApiProperty({ description: 'ID de la sucursal', required: false })
  @IsOptional()
  @IsNumber()
  sucursalId?: number;

  @ApiProperty({ 
    description: 'Lista de productos', 
    type: [CreateSalesOrderItemDto]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSalesOrderItemDto)
  items: CreateSalesOrderItemDto[];

  // 👇 AGREGAR: Campos nuevos para control
  @ApiProperty({ description: 'Reservar inventario automáticamente', required: false, default: false })
  @IsOptional()
  @IsBoolean()
  reservarInventario?: boolean;

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
}