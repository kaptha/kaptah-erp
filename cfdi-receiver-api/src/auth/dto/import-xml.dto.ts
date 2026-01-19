import { IsString, IsNotEmpty } from 'class-validator';

export class ImportarXmlsDto {
  @IsString()
  @IsNotEmpty()
  rutaBase: string;
}