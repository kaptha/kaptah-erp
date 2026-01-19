import { IsString, IsEmail, IsNotEmpty, Length, Matches, IsOptional, IsNumber, IsEnum } from 'class-validator';

export class UpdateSupplierDto {
  @IsOptional()
  @IsString()
  @Length(2, 100)
  nombre?: string;

  @IsOptional()
  @IsString()
  @Length(2, 150)
  razon_social?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @Length(10, 20)
  @Matches(/^[0-9]+$/, {message: 'Teléfono debe contener solo números'})
  telefono?: string;

  @IsOptional()
  @IsString()
  @Length(12, 13)
  @Matches(/^[A-Z&Ñ]{3,4}[0-9]{6}[A-Z0-9]{3}$/, {
    message: 'RFC no válido. Debe tener entre 12 y 13 caracteres y seguir el formato correcto.'
  })
  rfc?: string;

  @IsOptional()
  @IsString()
  @Length(3, 3)
  regimen_fiscal?: string;

  @IsOptional()
  @IsEnum(['fisica', 'moral'], {message: 'Tipo de contribuyente debe ser fisica o moral'})
  tipo_contribuyente?: 'fisica' | 'moral';

  @IsOptional()
  @IsString()
  @Length(5, 5)
  @Matches(/^[0-9]+$/, {message: 'Código postal debe contener solo números'})
  Cpostal?: string;

  @IsOptional()
  @IsString()
  @Length(2, 100)
  colonia?: string;

  @IsOptional()
  @IsString()
  calle?: string;

  @IsOptional()
  @IsString()
  numero_ext?: string;

  @IsOptional()
  @IsString()
  numero_int?: string;

  @IsOptional()
  @IsString()
  municipio?: string;

  @IsOptional()
  @IsString()
  estado?: string;

  @IsOptional()
  @IsString()
  banco?: string;

  @IsOptional()
  @IsString()
  @Length(10, 20)
  cuenta_bancaria?: string;

  @IsOptional()
  @IsEnum(['cheques', 'ahorro'], {message: 'Tipo de cuenta debe ser cheques o ahorro'})
  tipo_cuenta?: 'cheques' | 'ahorro';

  @IsOptional()
  @IsString()
  @Length(18, 18)
  @Matches(/^[0-9]+$/, {message: 'CLABE debe contener solo números'})
  clabe?: string;

  @IsOptional()
  @IsString()
  beneficiario?: string;

  @IsOptional()
  @IsNumber()
  limite_credito?: number;

  @IsOptional()
  @IsNumber()
  dias_credito?: number;

  @IsOptional()
  @IsString()
  categoria?: string;

  @IsOptional()
  @IsString()
  notas?: string;
}