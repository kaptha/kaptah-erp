import { IsString, IsEmail, IsNotEmpty, Length, Matches, IsEnum } from 'class-validator';

export class CreateClientDto {
  @IsString()
  @IsNotEmpty()
  @Length(2, 100)
  nombre: string;

  @IsEnum(['fisica', 'moral'], {
    message: 'tipoPersona debe ser "fisica" o "moral"'
  })
  @IsNotEmpty()
  tipoPersona: 'fisica' | 'moral';

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @Length(10, 20)
  @Matches(/^[0-9]+$/, {message: 'Telefono debe contener solo números'})
  Telefono: string;

  @IsString()
  @IsNotEmpty()
  @Length(12, 13)
  @Matches(/^[A-Z&Ñ]{3,4}[0-9]{6}[A-Z0-9]{3}$/, {
    message: 'RFC no válido. Debe tener entre 12 y 13 caracteres y seguir el formato correcto.'
  })
  Rfc: string;

  @IsString()
  @IsNotEmpty()
  @Length(3, 3)
  RegFiscal: string;

  @IsString()
  @IsNotEmpty()
  @Length(3, 255)
  Direccion: string;

  @IsString()
  @IsNotEmpty()
  @Length(2, 100)
  Ciudad: string;

  @IsString()
  @IsNotEmpty()
  @Length(5, 5)
  @Matches(/^[0-9]+$/, {message: 'Código postal debe contener solo números'})
  Cpostal: string;

  @IsString()
  @IsNotEmpty()
  @Length(2, 100)
  Colonia: string;
}