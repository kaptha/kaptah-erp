import { IsString, IsEmail, IsOptional, IsBoolean } from 'class-validator';

export class CreateUserDto {
  @IsString()
  firebaseUid: string;

  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsBoolean()
  @IsOptional()
  active?: boolean;

  @IsString()
  @IsOptional()
  photoURL?: string;
}