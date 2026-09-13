import { IsNotEmpty, IsOptional, IsString, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateFielCertificateDto {
    @ApiProperty({ description: 'ID del usuario' })
    @IsString()
    @IsOptional()
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

    @ApiProperty({ description: 'Contraseña de la llave privada' })
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

    /**
     * Consentimiento: "Autorizo que la contraseña de mi e.firma se guarde cifrada para
     * descargar automáticamente mis CFDI del SAT". En multipart llega como 'true'/'false'.
     */
    @ApiPropertyOptional({ description: 'Autoriza guardar la contraseña cifrada para descarga masiva automática' })
    @IsOptional()
    @Transform(({ value }) => value === true || value === 'true' || value === '1')
    @IsBoolean()
    autorizarDescargaMasiva?: boolean;

    // Estos campos se manejarán en el servicio
    cerFile: Buffer;
    keyFile: Buffer;
}
