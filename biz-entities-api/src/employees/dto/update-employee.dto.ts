import { PartialType } from '@nestjs/mapped-types';
import { CreateEmployeeDto } from './create-employee.dto';
import { IsString, IsEmail, IsNotEmpty, Length, Matches, IsNumber, IsDate, IsOptional, ValidateNested, IsArray, Min } from 'class-validator';
import { Type } from 'class-transformer';
export class UpdateEmployeeDto extends PartialType(CreateEmployeeDto) {
    @IsString()
  @IsOptional()
  @Type(() => String)
  fecha_inicio?: string;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  salario_base?: number;
}