import { IsString, IsNumber, IsNotEmpty, Length, Min, Max } from 'class-validator';

export class UpdateTaxDto {
  @IsString()
  @IsNotEmpty()
  @Length(2, 100)
  alias: string;

  @IsString()
  @IsNotEmpty()
  @Length(2, 100)
  uso: string;

  @IsString()
  @IsNotEmpty()
  @Length(2, 100)
  tipo_impuesto: string;

  @IsString()
  @IsNotEmpty()
  @Length(2, 100)
  impuesto: string;

  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  @Max(100)
  tasa: number;

  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  valor_cuota: string;
}