import { IsNotEmpty, IsOptional, IsString, IsUUID, IsNumber, IsIP } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateFielLogDto {
    @ApiProperty()
    @IsUUID()
    @IsNotEmpty()
    fielId: string;

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

    @ApiPropertyOptional({ description: 'Período solicitado (ej: 2024-01)' })
    @IsString()
    @IsOptional()
    requestPeriod?: string;

    @ApiPropertyOptional({ description: 'Tipo de solicitud' })
    @IsString()
    @IsOptional()
    requestType?: string;

    @ApiPropertyOptional({ description: 'Cantidad de archivos descargados' })
    @IsNumber()
    @IsOptional()
    downloadedFilesCount?: number;

    @ApiPropertyOptional({ description: 'Mensaje de error si existe' })
    @IsString()
    @IsOptional()
    errorMessage?: string;

    @ApiPropertyOptional({ description: 'Tiempo de ejecución en ms' })
    @IsNumber()
    @IsOptional()
    executionTime?: number;
}