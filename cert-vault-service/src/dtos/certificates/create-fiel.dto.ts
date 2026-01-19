import { IsNotEmpty, IsOptional, IsString, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateFielCertificateDto {
    @ApiProperty({ description: 'ID del usuario' })
    @IsString()  // Cambiado de @IsUUID() a @IsString()
    @IsNotEmpty()
    userId: string;

    @ApiProperty({ description: 'Número de certificado' })
    @IsString()
    @IsNotEmpty()
    certificateNumber: string;

    @ApiProperty({ description: 'Número de serie' })
    @IsString()
    @IsNotEmpty()
    serialNumber: string;

    @ApiProperty({ description: 'Fecha de inicio de validez' })
    @IsString()
    @IsNotEmpty()
    validFrom: string;

    @ApiProperty({ description: 'Fecha de fin de validez' })
    @IsString()
    @IsNotEmpty()
    validUntil: string;

    @ApiProperty({ description: 'Contraseña del certificado' })
    @IsString()
    @IsNotEmpty()
    password: string;

    @ApiProperty({ description: 'Nombre del emisor' })
    @IsString()
    @IsNotEmpty()
    issuerName: string;

    @ApiProperty({ description: 'Número de serie del emisor' })
    @IsString()
    @IsNotEmpty()
    issuerSerial: string;

    // Estos campos se manejarán en el servicio
    cerFile: Buffer;
    keyFile: Buffer;
}