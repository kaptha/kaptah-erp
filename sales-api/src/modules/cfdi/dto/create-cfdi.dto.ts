import { IsString, IsNumber, IsObject, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class EmisorDto {
  @IsString()
  rfc: string;

  @IsString()
  nombre: string;

  @IsString()
  regimenFiscal: string;
}

export class ReceptorDto {
  @IsString()
  rfc: string;

  @IsString()
  nombre: string;

  @IsString()
  domicilioFiscalReceptor: string;

  @IsString()
  regimenFiscalReceptor: string;

  @IsString()
  usoCFDI: string;
}

export class CreateCfdiIngresoDto {
  @IsString()
  serie?: string;

  @IsString()
  folio?: string;

  @IsString()
  fecha: string;

  @IsString()
  formaPago: string;

  @IsString()
  metodoPago: 'PUE' | 'PPD';

  @ValidateNested()
  @Type(() => EmisorDto)
  emisor: EmisorDto;

  @ValidateNested()
  @Type(() => ReceptorDto)
  receptor: ReceptorDto;

  @IsArray()
  @ValidateNested({ each: true })
  conceptos: any[];
}