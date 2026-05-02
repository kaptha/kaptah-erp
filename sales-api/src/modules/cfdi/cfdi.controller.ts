import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Delete,
  UseGuards,
  Req,
  Res,
  Logger,
  HttpException,
  HttpStatus,
  UploadedFile,
  UseInterceptors,
  Query
} from '@nestjs/common';
import { Request, Response } from 'express';
import * as path from 'path';
import { CfdiService } from './cfdi.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { RequirePermission } from '../../auth/decorators/require-permission.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '../../auth/interfaces/user.interface';
import { FirebaseToken } from '../../auth/decorators/firebase-token.decorator';
import { CreateIngresoCfdiDto } from './dto/create-ingreso-cfdi.dto';
import { CfdiIngreso, CfdiEgreso } from './interfaces/cfdi-types.interface';
import { CreateNominaCfdiDto } from './dto/create-nomina-cfdi.dto';
import { CreatePagoCfdiDto } from './dto/create-pago-cfdi.dto';
import { SignService } from './security/digital-sign/sign.service';
import { Public } from '../../auth/decorators/public.decorator';
import { FileInterceptor } from '@nestjs/platform-express';

interface RequestWithUser extends Request {
  user?: any;
}

@Controller('cfdi')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CfdiController {
  private readonly logger = new Logger(CfdiController.name);

  constructor(
    private readonly cfdiService: CfdiService,
    private readonly signService: SignService,
  ) {
    this.logger.log('CfdiController inicializado v2');
  }

  private extractFirebaseToken(req: Request): string {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new HttpException(
        'Token de autenticacion no encontrado en el header Authorization',
        HttpStatus.UNAUTHORIZED
      );
    }
    return authHeader.replace('Bearer ', '');
  }

  // ==========================================
  // RUTAS ESPECIFICAS PRIMERO (antes de :id)
  // ==========================================

  @Get('list')
  async listCfdis(@Req() req: RequestWithUser, @Query('cuentaUid') cuentaUid?: string) {
    const ownerUid = cuentaUid || req.user.uid;
    this.logger.log(`Listando CFDIs del usuario: ${ownerUid}`);
    return this.cfdiService.findAll(ownerUid);
  }

  @Get('validate-keys')
  async validateKeys(@Req() req: RequestWithUser) {
    try {
      const firebaseToken = this.extractFirebaseToken(req);
      const isValid = await this.signService.validateKeyPair(firebaseToken);
      return {
        success: true,
        isValid,
        message: isValid ? 'Par de llaves valido' : 'Par de llaves invalido'
      };
    } catch (error) {
      throw new HttpException(
        `Error validando par de llaves: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('certificate-info')
  async getCertificateInfo(@Req() req: RequestWithUser) {
    try {
      const firebaseToken = this.extractFirebaseToken(req);
      const certInfo = await this.signService.getCertificateInfo(firebaseToken);
      const isValid = await this.signService.validateCertificate(firebaseToken);
      return {
        success: true,
        certificateNumber: certInfo.number,
        isValid,
        message: isValid ? 'Certificado valido' : 'Certificado no valido'
      };
    } catch (error) {
      throw new HttpException(
        `Error obteniendo informacion del certificado: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('certificate/validate')
  async validateCertificate(@Req() req: RequestWithUser) {
    try {
      const firebaseToken = this.extractFirebaseToken(req);
      const isValid = await this.signService.validateCertificate(firebaseToken);
      return {
        success: true,
        isValid,
        message: isValid ? 'Certificado valido y vigente' : 'Certificado no valido'
      };
    } catch (error) {
      throw new HttpException(
        `Error validando certificado: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // ==========================================
  // RUTAS POST SIN PARAMETROS
  // ==========================================

  @Post('ingreso')
  @RequirePermission('cfdi.crear')
  async createIngresoCfdi(
    @Body() createIngresoCfdiDto: CreateIngresoCfdiDto,
    @CurrentUser() user: User,
    @FirebaseToken() firebaseToken: string,
    @Query('cuentaUid') cuentaUid?: string,
  ) {
    try {
      const isCertificateValid = await this.cfdiService.validateUserCertificate(firebaseToken);
      if (!isCertificateValid) {
        throw new HttpException(
          'Su certificado CSD no es valido o ha expirado.',
          HttpStatus.BAD_REQUEST
        );
      }
      const ownerUid = cuentaUid || user.uid;
      return await this.cfdiService.createIngresoCfdi(createIngresoCfdiDto, { ...user, uid: ownerUid }, firebaseToken);
    } catch (error) {
      this.logger.error('Error creando CFDI de ingreso:', error);
      throw error;
    }
  }

  @Post('egreso')
  @RequirePermission('cfdi.crear')
  async generateEgressCfdi(
    @Body() data: CfdiEgreso,
    @CurrentUser() user: User,
    @Req() req: RequestWithUser,
    @Query('cuentaUid') cuentaUid?: string,
  ) {
    try {
      if (!user || !user.uid) {
        throw new HttpException('Usuario no valido', HttpStatus.UNAUTHORIZED);
      }
      const firebaseToken = this.extractFirebaseToken(req);
      const isCertificateValid = await this.cfdiService.validateUserCertificate(firebaseToken);
      if (!isCertificateValid) {
        throw new HttpException(
          'Su certificado CSD no es valido o ha expirado.',
          HttpStatus.BAD_REQUEST
        );
      }
      const ownerUid = cuentaUid || user.uid;
      return await this.cfdiService.createEgresoCfdi(data, { ...user, uid: ownerUid }, firebaseToken);
    } catch (error) {
      this.logger.error('Error generando CFDI de egreso:', error);
      throw error;
    }
  }

  @Post('nomina')
  @RequirePermission('cfdi.crear')
  async createNominaCfdi(
    @Body() createNominaCfdiDto: CreateNominaCfdiDto,
    @CurrentUser() user: User,
    @Req() req: RequestWithUser,
    @Query('cuentaUid') cuentaUid?: string,
  ) {
    try {
      if (!user || !user.uid) {
        throw new HttpException('Usuario no valido', HttpStatus.UNAUTHORIZED);
      }
      const firebaseToken = this.extractFirebaseToken(req);
      const isCertificateValid = await this.cfdiService.validateUserCertificate(firebaseToken);
      if (!isCertificateValid) {
        throw new HttpException(
          'Su certificado CSD no es valido o ha expirado.',
          HttpStatus.BAD_REQUEST
        );
      }
      const ownerUid = cuentaUid || user.uid;
      return await this.cfdiService.createNominaCfdi(createNominaCfdiDto, { ...user, uid: ownerUid }, firebaseToken);
    } catch (error) {
      this.logger.error('Error creando CFDI de nomina:', error);
      throw error;
    }
  }

  @Post('pago')
  @RequirePermission('cfdi.crear')
  async createPagoCfdi(
    @Body() createPagoCfdiDto: CreatePagoCfdiDto,
    @CurrentUser() user: User,
    @Req() req: RequestWithUser,
    @Query('cuentaUid') cuentaUid?: string,
  ) {
    try {
      if (!user || !user.uid) {
        throw new HttpException('Usuario no valido', HttpStatus.UNAUTHORIZED);
      }
      const firebaseToken = this.extractFirebaseToken(req);
      const isCertificateValid = await this.cfdiService.validateUserCertificate(firebaseToken);
      if (!isCertificateValid) {
        throw new HttpException(
          'Su certificado CSD no es valido o ha expirado.',
          HttpStatus.BAD_REQUEST
        );
      }
      const ownerUid = cuentaUid || user.uid;
      return await this.cfdiService.createPagoCfdi(createPagoCfdiDto, { ...user, uid: ownerUid }, firebaseToken);
    } catch (error) {
      this.logger.error('Error creando CFDI de pago:', error);
      throw error;
    }
  }

  @Post('test-signature')
  async testSignature(
    @Req() req: RequestWithUser,
    @Body() body: { csdPassword: string }
  ) {
    try {
      const firebaseToken = this.extractFirebaseToken(req);
      if (!body.csdPassword) {
        throw new HttpException(
          'Se requiere la contrasena del certificado en el body',
          HttpStatus.BAD_REQUEST
        );
      }
      const cadenaOriginal = '||4.0|F|1001|2025-02-24T19:52:23|03|800.00|MXN|928.00|I|01|PPD|94734|EKU9003173C9|ESCUELA KEMPER URGATE SA DE CV|601|CAHZ7608262P1|ZARATE HUERTA CARLOS ALBERTO|44100|612|G03||';
      const sello = await this.signService.sign(
        cadenaOriginal,
        firebaseToken,
        body.csdPassword
      );
      const certInfo = await this.signService.getCertificateInfo(firebaseToken);
      return {
        success: true,
        cadenaOriginal,
        sello,
        selloLength: sello.length,
        certificateNumber: certInfo.number,
        message: 'Firma de prueba generada exitosamente'
      };
    } catch (error) {
      throw new HttpException(
        `Error en prueba de firma: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('upload-zip')
  @UseInterceptors(FileInterceptor('file'))
  async uploadZip(
    @UploadedFile() file: any,
    @CurrentUser() user: User
  ) {
    if (!file) {
      throw new HttpException('No se recibio archivo', HttpStatus.BAD_REQUEST);
    }
    this.logger.log(`Recibido ZIP: ${file.originalname} (${file.size} bytes)`);
    return await this.cfdiService.processBatchZip(
      file,
      user.uid,
      'free'
    );
  }

  @Post('send-overdue-reminders')
  async sendOverdueReminders(@Req() req: RequestWithUser) {
    // placeholder
  }

  // ==========================================
  // RUTAS CON PARAMETROS (al final)
  // ==========================================

  @Public()
  @Get(':id/pdf/:style')
  async generarPdfDeCfdi(
    @Param('id') id: string,
    @Param('style') estilo: string,
    @Req() req: Request,
    @Res() res: Response,
    @Query('cuentaUid') cuentaUid?: string,
  ) {
    console.log('Request para generar PDF de CFDI');
    const firebaseToken = req.headers['x-firebase-token'] as string;
    const authHeader = req.headers.authorization;
    const token = firebaseToken ? `Bearer ${firebaseToken}` : (authHeader?.startsWith('Bearer ') ? authHeader : null);
    console.log('Token recibido:', token ? 'Si' : 'No');
    try {
      const pdf = await this.cfdiService.generarPdfCfdi(
        id,
        null,
        estilo,
        token,
        cuentaUid
      );
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename=cfdi_${id}.pdf`,
        'Content-Length': pdf.length,
      });
      res.end(pdf);
    } catch (error) {
      this.logger.error('Error generando PDF de CFDI:', error);
      res.status(500).json({
        success: false,
        message: 'Error al generar PDF del CFDI',
        error: error.message
      });
    }
  }

  @Get('batch/:batchId/status')
  async getBatchStatus(
    @Param('batchId') batchId: string,
    @CurrentUser() user: User
  ) {
    return await this.cfdiService.getBatchStatus(batchId, user.uid);
  }

  @Get(':id')
  async getCfdi(@Param('id') id: string, @Req() req: RequestWithUser, @Query('cuentaUid') cuentaUid?: string) {
    const ownerUid = cuentaUid || req.user.uid;
    this.logger.log(`Obteniendo CFDI ${id} para usuario: ${ownerUid}`);
    return this.cfdiService.findOne(id, ownerUid);
  }

  @Delete(':id')
  @RequirePermission('cfdi.eliminar')
  async deleteCfdi(@Param('id') id: string, @Req() req: RequestWithUser, @Query('cuentaUid') cuentaUid?: string) {
    const ownerUid = cuentaUid || req.user.uid;
    this.logger.log(`Eliminando CFDI ${id} para usuario: ${ownerUid}`);
    return this.cfdiService.delete(id, ownerUid);
  }

  @Post(':id/cancelar')
  @RequirePermission('cfdi.eliminar')
  async cancelarCfdi(
    @Param('id') id: string,
    @Body() body: { motivo: string; uuidSustitucion?: string },
    @CurrentUser() user: User,
    @Req() req: RequestWithUser,
    @Query('cuentaUid') cuentaUid?: string,
  ) {
    const firebaseToken = this.extractFirebaseToken(req);
    const ownerUid = cuentaUid || user.uid;
    return await this.cfdiService.cancelarCfdi(
      id,
      body.motivo,
      body.uuidSustitucion || null,
      ownerUid,
      firebaseToken
    );
  }

  @Post(':id/reenviar-email')
  async reenviarEmail(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Query('cuentaUid') cuentaUid?: string,
  ) {
    const ownerUid = cuentaUid || user.uid;
    return await this.cfdiService.reenviarEmail(id, ownerUid);
  }

  @Post(':id/enviar-email')
  @RequirePermission('cfdi.crear')
  async enviarCfdiEmail(
    @Param('id') id: string,
    @Body() body: {
      clienteEmail: string;
      customMessage?: string;
      pdfStyle?: string;
    },
    @CurrentUser() user: User,
    @Req() req: RequestWithUser,
    @Query('cuentaUid') cuentaUid?: string,
  ) {
    if (!body.clienteEmail) {
      throw new HttpException('El email del destinatario es requerido', HttpStatus.BAD_REQUEST);
    }
    const ownerUid = cuentaUid || user.uid;
    const firebaseToken = req.headers['x-firebase-token'] as string || this.extractFirebaseToken(req);
    return await this.cfdiService.sendCfdiByEmail(id, body.clienteEmail, body.customMessage || '', ownerUid, firebaseToken, body.pdfStyle || 'classic');
  }

  @Post(':id/regenerar-pdf')
  async regenerarPDF(
    @Param('id') id: string,
    @Body() body: { templateType?: string },
    @CurrentUser() user: User,
    @Query('cuentaUid') cuentaUid?: string,
  ) {
    const ownerUid = cuentaUid || user.uid;
    return await this.cfdiService.regenerarPDF(
      id,
      ownerUid,
      body.templateType || 'clasico'
    );
  }

  @Patch(':id/internal-update')
  @Public()
  async internalUpdateCfdi(
    @Param('id') id: string,
    @Body() updateData: {
      uuid?: string;
      xml?: string;
      fechaTimbrado?: Date;
      noCertificadoSAT?: string;
      selloSAT?: string;
      selloCFD?: string;
      status?: string;
      error_message?: string;
    },
    @Req() req: Request
  ) {
    const serviceToken = req.headers.authorization?.replace('Bearer ', '');
    if (serviceToken !== process.env.SERVICE_TOKEN) {
      throw new HttpException('No autorizado', HttpStatus.UNAUTHORIZED);
    }
    await this.cfdiService.internalUpdateCfdi(id, updateData);
    return {
      success: true,
      message: 'CFDI actualizado correctamente'
    };
  }
}