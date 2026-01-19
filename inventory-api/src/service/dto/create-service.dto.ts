import { IsString, IsNotEmpty, Length, IsNumber, IsOptional, IsPositive } from 'class-validator';

export class CreateServiceDto {
  @IsString()
  @IsNotEmpty()
  @Length(2, 100)
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsNotEmpty()
  satKey: string; // Clave SAT del servicio

  @IsString()
  @IsNotEmpty()
  unitId: string;

  @IsNumber()
  @IsNotEmpty()
  categoryId: number;

  @IsNumber()
  @IsPositive()
  price: number;

  @IsString()
  @IsNotEmpty()
  moneda: string;

  @IsNumber()
  @IsOptional()
  @IsPositive()
  duration?: number; // Duración en minutos
}