import { IsString, IsNotEmpty, Length, IsOptional, IsEnum } from 'class-validator';

export enum CategoryType {
  PRODUCTO = 'producto',
  SERVICIO = 'servicio'
}

export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(CategoryType)
  @IsNotEmpty()
  tipo: CategoryType;
}