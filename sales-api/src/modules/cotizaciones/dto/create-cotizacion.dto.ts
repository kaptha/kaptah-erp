import { IsNumber, IsString, IsOptional, IsArray, IsDate, ValidateNested, Min, IsBoolean, IsEmail } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class CreateCotizacionDto {
  // ✅ Aceptar tanto usuario_id como usuarioId
  @IsNumber()
  @Transform(({ obj }) => obj.usuarioId || obj.usuario_id)
  usuario_id: number;

  @IsNumber()
  cliente_id: number;

  @IsOptional()
  @IsString()
  cliente_nombre?: string;

  @IsOptional()
  @IsString()
  cliente_rfc?: string;

  @IsOptional()
  @IsString()
  cliente_direccion?: string;

  @IsOptional()
  @IsString()
  cliente_ciudad?: string;

  @IsOptional()
  @IsString()
  cliente_telefono?: string;

  // ✨ NUEVO: Campo de sucursal (opcional)
  @IsOptional()
  @IsNumber()
  sucursal_id?: number;

  @IsDate()
  @Type(() => Date)
  fecha_validez: Date;

  @IsString()
  estado: string;

  @IsNumber()
  @Min(0)
  subtotal: number;

  @IsNumber()
  @Min(0)
  impuestos: number;

  @IsNumber()
  @Min(0)
  total: number;

  @IsString()
  moneda: string;

  @IsOptional()
  @IsString()
  observaciones?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCotizacionItemDto)
  items: CreateCotizacionItemDto[];

  // 👇 AGREGAR: Campos para email automático
  @IsOptional()
  @IsBoolean()
  enviarEmail?: boolean;

  @IsOptional()
  @IsEmail()
  clienteEmail?: string;
}


export class CreateCotizacionItemDto {
  @IsOptional()
  @IsNumber()
  producto_id?: number;

  @IsOptional()
  @IsNumber()
  servicio_id?: number;

  @IsString()
  tipo: string; // 'producto' o 'servicio'

  @IsString()
  descripcion: string;

  @IsNumber()
  @Min(1)
  cantidad: number;

  @IsNumber()
  @Min(0)
  precio_unitario: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  descuento?: number;

  @IsNumber()
  @Min(0)
  subtotal: number;

  @IsNumber()
  @Min(0)
  impuestos: number;

  @IsNumber()
  @Min(0)
  total: number;

  @IsOptional()
  impuestos_seleccionados?: any[];
}