import { IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @IsNotEmpty()
  @IsString()
  firebaseToken: string;
}

export class RefreshTokenDto {
  @IsNotEmpty()
  @IsString()
  refresh_token: string;
}

export class AuthResponseDto {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user?: {
    uid: string;
    email: string;
  };
}