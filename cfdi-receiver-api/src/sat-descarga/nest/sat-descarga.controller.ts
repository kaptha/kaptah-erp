import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { IsIn, IsNotEmpty, IsString, Matches } from 'class-validator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { SatSolicitudTipo, SatSolicitudTipoSolicitud } from './entities/sat-solicitud.entity';
import { SatDescargaService } from './sat-descarga.service';
import { SatDescargaSyncService } from './sat-descarga-sync.service';

interface JwtUser {
  uid: string;
  email?: string;
  rfc?: string | null;
}

const FECHA = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2})?$/;

export class SolicitarDto {
  @IsIn(['RECIBIDOS', 'EMITIDOS'])
  tipo: SatSolicitudTipo;

  @IsIn(['CFDI', 'Metadata'])
  tipoSolicitud: SatSolicitudTipoSolicitud;

  @IsString() @IsNotEmpty() @Matches(FECHA)
  fechaInicial: string;

  @IsString() @IsNotEmpty() @Matches(FECHA)
  fechaFinal: string;
}

/**
 * POST /sat-descarga/solicitudes         crear solicitud manual
 * GET  /sat-descarga/solicitudes         listar las de la cuenta
 * GET  /sat-descarga/solicitudes/:id     detalle
 * POST /sat-descarga/solicitudes/:id/procesar   verificar/descargar ahora (sin esperar al cron)
 *
 * La cuenta es user.uid; ?cuentaUid= permite operar otra (Plan Despacho).
 */
@Controller('sat-descarga')
@UseGuards(JwtAuthGuard)
export class SatDescargaController {
  constructor(
    private readonly service: SatDescargaService,
    private readonly sync: SatDescargaSyncService,
  ) {}

  @Post('solicitudes')
  solicitar(@CurrentUser() user: JwtUser, @Body() dto: SolicitarDto, @Query('cuentaUid') cuentaUid?: string) {
    return this.service.solicitar({ ...dto, cuentaUid: cuentaUid || user.uid, origen: 'MANUAL' });
  }

  @Get('solicitudes')
  listar(@CurrentUser() user: JwtUser, @Query('cuentaUid') cuentaUid?: string) {
    return this.service.listar(cuentaUid || user.uid);
  }

  @Get('solicitudes/:id')
  obtener(@CurrentUser() user: JwtUser, @Param('id') id: string, @Query('cuentaUid') cuentaUid?: string) {
    return this.service.obtener(cuentaUid || user.uid, id);
  }

  @Post('solicitudes/:id/procesar')
  async procesar(@CurrentUser() user: JwtUser, @Param('id') id: string, @Query('cuentaUid') cuentaUid?: string) {
    const s = await this.service.obtener(cuentaUid || user.uid, id);
    const v = s.estado === 'ENVIADA' ? await this.service.verificar(s) : s;
    return v.estado === 'LISTA' || v.estado === 'DESCARGANDO' ? this.service.descargarEImportar(v) : v;
  }

  /** Dispara el ciclo de pendientes a mano (útil en piloto) */
  @Post('procesar-pendientes')
  async procesarPendientes() {
    await this.sync.procesarPendientes();
    return { status: 'ok' };
  }
}
