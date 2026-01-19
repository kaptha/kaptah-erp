import { IsString, IsEmail, IsOptional, IsBoolean, IsIn } from 'class-validator';

export class CreateUserDto {
  @IsString()
  nombre: string;

  @IsEmail()
  email: string;

  @IsOptional() 
  @IsString()
  telefono?: string;

  @IsString()
  firebaseUid: string;

  @IsString()
  realtimeDbKey: string;

  @IsOptional()
  @IsString()
  rfc?: string;

  @IsOptional()
  @IsIn(['fisica', 'moral'])
  tipo_persona?: 'fisica' | 'moral';

  @IsOptional()
  @IsString()
  fiscalReg?: string;

  @IsOptional()
  @IsBoolean()
  returnSecureToken?: boolean;

  @IsOptional()
  @IsBoolean()
  Confirm?: boolean;
}