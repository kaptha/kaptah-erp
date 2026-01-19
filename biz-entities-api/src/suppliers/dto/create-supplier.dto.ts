import { IsString, IsEmail, IsNotEmpty, Length, Matches, IsOptional, IsNumber, IsEnum } from 'class-validator';

export class CreateSupplierDto {
  @IsString()
  @IsNotEmpty()
  @Length(2, 100)
  nombre: string;

  @IsString()
  @IsNotEmpty()
  @Length(2, 150)
  razon_social: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @Length(10, 20)
  @Matches(/^[0-9]+$/, {message: 'Teléfono debe contener solo números'})
  telefono: string;

  @IsString()
  @IsNotEmpty()
  @Length(12, 13)
  @Matches(/^[A-Z&Ñ]{3,4}[0-9]{6}[A-Z0-9]{3}$/, {
    message: 'RFC no válido. Debe tener entre 12 y 13 caracteres y seguir el formato correcto.'
  })
  rfc: string;

  @IsString()
  @IsNotEmpty()
  @Length(3, 3)
  regimen_fiscal: string;

  @IsNotEmpty()
  @IsEnum(['fisica', 'moral'], {message: 'Tipo de contribuyente debe ser fisica o moral'})
  tipo_contribuyente: 'fisica' | 'moral';

  // Mantener los campos existentes de CP y colonia con sus validaciones
  @IsString()
  @IsNotEmpty()
  @Length(5, 5)
  @Matches(/^[0-9]+$/, {message: 'Código postal debe contener solo números'})
  Cpostal: string;

  @IsString()
  @IsNotEmpty()
  @Length(2, 100)
  colonia: string;

  // Campos adicionales de dirección
  @IsString()
  @IsNotEmpty()
  calle: string;

  @IsString()
  @IsNotEmpty()
  numero_ext: string;

  @IsString()
  @IsOptional()
  numero_int?: string;

  @IsString()
  @IsNotEmpty()
  municipio: string;

  @IsString()
  @IsNotEmpty()
  estado: string;

  // Información bancaria
  @IsString()
  @IsNotEmpty()
  banco: string;

  @IsString()
  @IsNotEmpty()
  @Length(10, 20)
  cuenta_bancaria: string;

  @IsNotEmpty()
  @IsEnum(['cheques', 'ahorro'], {message: 'Tipo de cuenta debe ser cheques o ahorro'})
  tipo_cuenta: 'cheques' | 'ahorro';

  @IsString()
  @IsOptional()
  @Length(18, 18)
  @Matches(/^[0-9]+$/, {message: 'CLABE debe contener solo números'})
  clabe?: string;

  @IsString()
  @IsNotEmpty()
  beneficiario: string;

  // Información comercial
  @IsNumber()
  @IsOptional()
  limite_credito?: number;

  @IsNumber()
  @IsOptional()
  dias_credito?: number;

  @IsString()
  @IsOptional()
  categoria?: string;

  @IsString()
  @IsOptional()
  notas?: string;
}