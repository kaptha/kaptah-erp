import { Body, Controller, Get, Param, Post, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ServiceTokenGuard } from '../auth/guards/service-token.guard';
import { FielService } from './fiel.service';

export class SignRequestDto {
  /** Bytes a firmar, en base64 */
  @IsString()
  @IsNotEmpty()
  data: string;

  @IsOptional()
  @IsIn(['RSA-SHA1'])
  algorithm?: 'RSA-SHA1';

  @IsOptional()
  @IsString()
  requestType?: string;

  @IsOptional()
  @IsString()
  requestPeriod?: string;
}

/**
 * Rutas servicio-a-servicio para descarga masiva. No usan token de usuario:
 * las protege ServiceTokenGuard (X-Service-Token). Consumidas por cfdi-receiver-api.
 */
@ApiExcludeController()
@UseGuards(ServiceTokenGuard)
@Controller('internal/fiel')
export class InternalFielController {
  constructor(private readonly fielService: FielService) {}

  /** Material no secreto: RFC, certificado PEM, serie decimal, emisor */
  @Get(':cuentaUid')
  async material(@Param('cuentaUid') cuentaUid: string) {
    return await this.fielService.findSigningMaterial(cuentaUid);
  }

  /** Firma RSA-SHA1; devuelve { signature: base64 } */
  @Post(':cuentaUid/sign')
  async sign(@Param('cuentaUid') cuentaUid: string, @Body() body: SignRequestDto) {
    const data = Buffer.from(body.data, 'base64');
    if (data.length === 0) {
      throw new BadRequestException('data vacío');
    }
    const signature = await this.fielService.sign(cuentaUid, data, {
      requestType: body.requestType,
      requestPeriod: body.requestPeriod,
    });
    return { signature: signature.toString('base64') };
  }
}
