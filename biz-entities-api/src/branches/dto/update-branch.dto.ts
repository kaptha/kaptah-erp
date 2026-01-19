import { IsString, IsNumber, IsNotEmpty, Length, Matches, Min, Max } from 'class-validator';

export class UpdateBranchDto {
  @IsString()
  @IsNotEmpty()
  @Length(2, 100)
  alias: string;

  @IsString()
  @IsNotEmpty()
  @Length(10, 20)
  @Matches(/^[0-9]+$/, {message: 'Teléfono debe contener solo números'})
  telefono: string;

  @IsString()
  @IsNotEmpty()
  @Length(5, 200)
  direccion: string;

  @IsNumber()
  @IsNotEmpty()
  @Min(10000)
  @Max(99999)
  codigoPostal: number;

  @IsString()
  @IsNotEmpty()
  @Length(2, 100)
  colonia: string;
}