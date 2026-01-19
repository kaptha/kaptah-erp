import { IsString, IsNotEmpty } from 'class-validator';

export class ProcessXmlDto {
 @IsString()
 @IsNotEmpty()
 xmlContent: string;
}