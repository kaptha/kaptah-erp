import { IsNotEmpty, IsOptional, IsString, IsUUID, IsNumber, IsIP, IsDecimal } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCsdLogDto {
    @ApiProperty()
    @IsUUID()
    @IsNotEmpty()
    csdId: string;

    @ApiProperty()
    @IsUUID()
    @IsNotEmpty()
    userId: string;

    @ApiProperty({ description: 'Tipo de acción realizada' })
    @IsString()
    @IsNotEmpty()
    actionType: string;

    @ApiProperty({ description: 'Dirección IP del cliente' })
    @IsIP()
    @IsOptional()
    ipAddress?: string;

    @ApiProperty({ description: 'Estado de la operación' })
    @IsString()
    @IsNotEmpty()
    status: string;

    @ApiPropertyOptional({ description: 'UUID del CFDI' })
    @IsString()
    @IsOptional()
    uuid?: string;

    @ApiPropertyOptional({ description: 'Tipo de comprobante' })
    @IsString()
    @IsOptional()
    invoiceType?: string;

    @ApiPropertyOptional({ description: 'Monto del CFDI' })
    @IsDecimal()
    @IsOptional()
    invoiceAmount?: number;

    @ApiPropertyOptional({ description: 'Mensaje de error si existe' })
    @IsString()
    @IsOptional()
    errorMessage?: string;

    @ApiPropertyOptional({ description: 'Tiempo de ejecución en ms' })
    @IsNumber()
    @IsOptional()
    executionTime?: number;

    @ApiPropertyOptional({ description: 'Respuesta del PAC' })
    @IsOptional()
    pacResponse?: any;
}