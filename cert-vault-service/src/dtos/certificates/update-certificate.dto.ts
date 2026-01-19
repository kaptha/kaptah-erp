import { IsOptional, IsString, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCertificateDto {
    @ApiPropertyOptional({ enum: ['active', 'expired', 'revoked'] })
    @IsEnum(['active', 'expired', 'revoked'])
    @IsOptional()
    status?: 'active' | 'expired' | 'revoked';

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    password?: string;
}