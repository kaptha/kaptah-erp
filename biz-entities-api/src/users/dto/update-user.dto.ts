import { IsString, IsOptional, IsEmail, Matches, Length, IsEnum } from 'class-validator';

export class UpdateUserDto {
  @IsString()
  firebaseUid: string;

  @IsString()
  @Length(1, 255)
  nombre: string;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  nombreComercial?: string;

  @IsString()
  @Matches(/^\d{10}$/, { message: 'El teléfono debe tener exactamente 10 dígitos' })
  phone: string;

   @IsString()
  @Matches(/^[A-ZÑ&]{3,4}\d{6}[A-Z\d]{3}$/, { message: 'RFC no válido' })
  rfc: string;

  @IsEnum(['fisica', 'moral'], { message: 'Tipo de persona debe ser "fisica" o "moral"' })
  tipoPersona: 'fisica' | 'moral';

  @IsString()
  @Length(1, 10)
  fiscalReg: string;
 
  @IsEmail()
  email: string;
}