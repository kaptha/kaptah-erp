import { IsString, IsNotEmpty, Length, IsOptional } from 'class-validator';

export class CreateServiceCategoryDto {
  @IsString()
  @IsNotEmpty()
  @Length(2, 100)
  name: string;

  @IsString()
  @IsOptional()
  @Length(0, 500)
  description?: string;
}