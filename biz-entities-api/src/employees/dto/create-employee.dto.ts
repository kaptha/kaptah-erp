import { IsString, IsEmail, IsNumber, IsArray, ValidateNested, Min, Matches, IsOptional } from 'class-validator';
import { Type, Transform } from 'class-transformer';
export class DeduccionPercepcionDto {
  @IsString()
  tipo: string;

  @IsString()
  clave: string;

  @IsString()
  concepto: string;

  @IsNumber()
  @Type(() => Number)
  importeGravado: number;

  @IsNumber()
  @Type(() => Number)
  importeExento: number;
}

export class CreateEmployeeDto {
  @IsString()
  nombre: string;

  @IsString()
  @Matches(/^[A-Z&Ñ]{3,4}[0-9]{6}[A-Z0-9]{3}$/)
  rfc: string;

  @IsString()
  @Transform(({ value }) => typeof value === 'string' ? value.toUpperCase().trim() : value)
  @Matches(/^[A-Z]{4}[0-9]{6}[HM][A-Z]{5}[0-9A-Z][0-9]$/, {
    message: 'El CURP no tiene un formato válido (18 caracteres, formato oficial SAT/RENAPO)',
  })
  curp: string;

  @IsEmail()
  email: string;

  @IsString()
  telefono: string;

  @IsString()
  fechaInicio: string;

  @IsString()
  puesto: string;

  @IsString()
  @IsOptional()
  departamento?: string;

  @IsNumber()
  @Type(() => Number)
  salarioBase: number;
  
    @IsString()
  @IsOptional()
  @Matches(/^[0-9]{5}$/, { message: 'El codigo postal debe ser de 5 digitos' })
  codigoPostal?: string;

  @IsString()
  @IsOptional()
  regimenFiscal?: string;

  @IsString()
  @IsOptional()
  numEmpleado?: string;

  @IsString()
  @IsOptional()
  @Matches(/^[0-9]{11}$/, { message: 'El NSS debe ser de 11 digitos' })
  numSeguridadSocial?: string;

  @IsString()
  @IsOptional()
  tipoContrato?: string;

  @IsString()
  @IsOptional()
  tipoRegimen?: string;

  @IsString()
  @IsOptional()
  tipoJornada?: string;

  @IsString()
  @IsOptional()
  riesgoPuesto?: string;

  @IsString()
  @IsOptional()
  periodicidadPago?: string;

  @IsString()
  @IsOptional()
  banco?: string;

  @IsString()
  @IsOptional()
  @Matches(/^[0-9]{18}$/, { message: 'La CLABE debe ser de 18 digitos' })
  cuentaBancaria?: string;

  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  salarioBaseCotApor?: number;

  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  salarioDiarioIntegrado?: number;

  @IsString()
  @IsOptional()
  claveEntFed?: string;
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DeduccionPercepcionDto)
  @IsOptional()
  deducciones?: DeduccionPercepcionDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DeduccionPercepcionDto)
  @IsOptional()
  percepciones?: DeduccionPercepcionDto[];
}