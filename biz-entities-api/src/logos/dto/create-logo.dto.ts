import { IsNotEmpty, IsNumber } from 'class-validator';

export class CreateLogoDto {
  @IsNotEmpty()
  @IsNumber()
  userId: number;
  
  // Los demás campos se obtendrán del archivo subido
}