import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  firebaseToken: string;
}

export class RefreshTokenDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  refresh_token: string;
}

export class AuthResponseDto {
  @ApiProperty()
  access_token: string;
  
  @ApiProperty()
  refresh_token: string;
  
  @ApiProperty()
  expires_in: number;
  
  @ApiProperty({
    type: 'object',
    properties: {
      uid: { type: 'string' },
      email: { type: 'string' }
    }
  })
  user?: {
    uid: string;
    email: string;
  };
}