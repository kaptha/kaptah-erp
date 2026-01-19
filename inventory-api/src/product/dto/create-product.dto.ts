import { IsString, IsNotEmpty, Length, IsNumber, IsOptional, Min, IsPositive } from 'class-validator';
import { Transform } from 'class-transformer';
export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  @Length(2, 100)
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  sku?: string;

  @IsString()
  @IsOptional()
  barcode?: string;

  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => {
    if (typeof value === 'object' && value !== null) {
      return value.c_claveprodserv || value.c_ClaveProdServ || String(value);
    }
    return String(value);
  })
  satKey: string;

  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => {
    if (typeof value === 'object' && value !== null) {
      return value.clave_unidad || value.c_ClaveUnidad || String(value);
    }
    return String(value);
  })
  unit_key: string;


  @IsNumber()
  @IsNotEmpty()
  categoryId: number;

  @IsNumber()
  @IsPositive()
  price: number;

  @IsNumber()
  @IsPositive()
  cost: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  minStock?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  maxStock?: number;

  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  currentStock: number;


  @IsOptional()
  active?: boolean;
}