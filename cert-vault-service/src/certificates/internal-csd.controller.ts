import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { ServiceTokenGuard } from '../auth/guards/service-token.guard';
import { CsdService } from './csd.service';

/**
 * Rutas servicio-a-servicio para CSD. No usan token de usuario:
 * las protege ServiceTokenGuard (X-Service-Token). Consumidas por el servicio de CFDI
 * para firmar con el CSD de la cuenta (cuentaUid), sin importar si quien emite es sub-usuario.
 */
@ApiExcludeController()
@UseGuards(ServiceTokenGuard)
@Controller('internal/csd')
export class InternalCsdController {
  constructor(private readonly csdService: CsdService) {}

  @Get(':cuentaUid/active')
  async active(@Param('cuentaUid') cuentaUid: string) {
    return await this.csdService.findActive(cuentaUid);
  }
}