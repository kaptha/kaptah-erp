import { IsString, IsNotEmpty, IsEmail, IsIn } from 'class-validator';

export class CreateCheckoutDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['basico', 'fiscal', 'erp', 'ilimitado'])
  plan: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(['mensual', 'anual'])
  cicloFacturacion: string;

  @IsString()
  @IsNotEmpty()
  firebaseUid: string;

  @IsString()
  @IsNotEmpty()
  customerName: string;

  @IsString()
  @IsNotEmpty()
  customerEmail: string;

  @IsString()
  @IsNotEmpty()
  customerPhone: string;
}
