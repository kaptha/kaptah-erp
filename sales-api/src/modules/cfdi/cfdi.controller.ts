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
  Logger,              // ⭐ AGREGAR
  HttpException,       // ⭐ AGREGAR
  HttpStatus,
  UploadedFile,
  UseInterceptors
} from '@nestjs/common';
import { Request, Response } from 'express';
import * as path from 'path';
import { CfdiService } from './cfdi.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
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
@UseGuards(JwtAuthGuard)
export class CfdiController {
  private readonly logger = new Logger(CfdiController.name);  // ✅ Ahora Logger está importado

  constructor(
    private readonly cfdiService: CfdiService,
    private readonly signService: SignService,
  ) {
    this.logger.log('CfdiController inicializado con certificados dinámicos');
  }

  /**
   * Extrae el Firebase token del header Authorization
   */
  private extractFirebaseToken(req: Request): string {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new HttpException(
        'Token de autenticación no encontrado en el header Authorization',
        HttpStatus.UNAUTHORIZED
      );
    }
    
    return authHeader.replace('Bearer ', '');
  }
  // ⭐ ENDPOINT: Generar PDF del CFDI
  @Public()
  @Get(':id/pdf/:style')
  async generarPdfDeCfdi(
    @Param('id') id: string,
    @Param('style') estilo: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    console.log('📄 Request para generar PDF de CFDI');
    
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader : null;
    
    console.log('🔑 Token recibido:', token ? 'Sí' : 'No');
    
    try {
      const pdf = await this.cfdiService.generarPdfCfdi(
        id, 
        null,
        estilo,
        token
      );

      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename=cfdi_${id}.pdf`,
        'Content-Length': pdf.length,
      });

      res.end(pdf);
    } catch (error) {
      this.logger.error('❌ Error generando PDF de CFDI:', error);
      res.status(500).json({
        success: false,
        message: 'Error al generar PDF del CFDI',
        error: error.message
      });
    }
  }

  // ⭐ NUEVO ENDPOINT: Listar todos los CFDIs del usuario
  @Get('list')
  async listCfdis(@Req() req: RequestWithUser) {
    console.log('📋 Endpoint /cfdi/list llamado');
    console.log('Usuario:', req.user);
    this.logger.log(`📋 Listando CFDIs del usuario: ${req.user?.uid}`);
    return this.cfdiService.findAll(req.user.uid);
  }

  // ⭐ NUEVO: Obtener CFDI por ID
  @Get(':id')
  async getCfdi(@Param('id') id: string, @Req() req: RequestWithUser) {
    this.logger.log(`🔍 Obteniendo CFDI ${id} para usuario: ${req.user?.uid}`);
    return this.cfdiService.findOne(id, req.user.uid);
  }

  // ⭐ NUEVO: Eliminar CFDI
  @Delete(':id')
  async deleteCfdi(@Param('id') id: string, @Req() req: RequestWithUser) {
    this.logger.log(`🗑️ Eliminando CFDI ${id} para usuario: ${req.user?.uid}`);
    return this.cfdiService.delete(id, req.user.uid);
  }

  @Get('validate-keys')
  async validateKeys(@Req() req: RequestWithUser) {
    try {
      const firebaseToken = this.extractFirebaseToken(req);
      const isValid = await this.signService.validateKeyPair(firebaseToken);
      
      return {
        success: true,
        isValid,
        message: isValid ? 'Par de llaves válido' : 'Par de llaves inválido'
      };
    } catch (error) {
      throw new HttpException(
        `Error validando par de llaves: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('ingreso')
  async createIngresoCfdi(
    @Body() createIngresoCfdiDto: CreateIngresoCfdiDto,
    @CurrentUser() user: User,
    @FirebaseToken() firebaseToken: string
  ) {
    try {
      const isCertificateValid = await this.cfdiService.validateUserCertificate(firebaseToken);
      
      if (!isCertificateValid) {
        throw new HttpException(
          'Su certificado CSD no es válido o ha expirado.',
          HttpStatus.BAD_REQUEST
        );
      }

      return await this.cfdiService.createIngresoCfdi(createIngresoCfdiDto, user, firebaseToken);
      
    } catch (error) {
      this.logger.error('Error creando CFDI de ingreso:', error);
      throw error;
    }
  }

  @Post('egreso')
  async generateEgressCfdi(
    @Body() data: CfdiEgreso,
    @CurrentUser() user: User,
    @Req() req: RequestWithUser
  ) {
    try {
      if (!user || !user.uid) {
        throw new HttpException(
          'Usuario no válido',
          HttpStatus.UNAUTHORIZED
        );
      }

      const firebaseToken = this.extractFirebaseToken(req);
      
      const isCertificateValid = await this.cfdiService.validateUserCertificate(firebaseToken);
      
      if (!isCertificateValid) {
        throw new HttpException(
          'Su certificado CSD no es válido o ha expirado.',
          HttpStatus.BAD_REQUEST
        );
      }

      return await this.cfdiService.createEgresoCfdi(data, user, firebaseToken);
      
    } catch (error) {
      this.logger.error('Error generando CFDI de egreso:', error);
      throw error;
    }
  }

  @Post('nomina')
  async createNominaCfdi(
    @Body() createNominaCfdiDto: CreateNominaCfdiDto,
    @CurrentUser() user: User,
    @Req() req: RequestWithUser
  ) {
    try {
      if (!user || !user.uid) {
        throw new HttpException(
          'Usuario no válido',
          HttpStatus.UNAUTHORIZED
        );
      }

      const firebaseToken = this.extractFirebaseToken(req);
      
      const isCertificateValid = await this.cfdiService.validateUserCertificate(firebaseToken);
      
      if (!isCertificateValid) {
        throw new HttpException(
          'Su certificado CSD no es válido o ha expirado.',
          HttpStatus.BAD_REQUEST
        );
      }

      return await this.cfdiService.createNominaCfdi(createNominaCfdiDto, user, firebaseToken);
      
    } catch (error) {
      this.logger.error('Error creando CFDI de nómina:', error);
      throw error;
    }
  }

  @Post('pago')
  async createPagoCfdi(
    @Body() createPagoCfdiDto: CreatePagoCfdiDto,
    @CurrentUser() user: User,
    @Req() req: RequestWithUser
  ) {
    try {
      if (!user || !user.uid) {
        throw new HttpException(
          'Usuario no válido',
          HttpStatus.UNAUTHORIZED
        );
      }

      const firebaseToken = this.extractFirebaseToken(req);
      
      const isCertificateValid = await this.cfdiService.validateUserCertificate(firebaseToken);
      
      if (!isCertificateValid) {
        throw new HttpException(
          'Su certificado CSD no es válido o ha expirado.',
          HttpStatus.BAD_REQUEST
        );
      }

      return await this.cfdiService.createPagoCfdi(createPagoCfdiDto, user, firebaseToken);
      
    } catch (error) {
      this.logger.error('Error creando CFDI de pago:', error);
      throw error;
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
        message: isValid ? 'Certificado válido' : 'Certificado no válido'
      };
    } catch (error) {
      throw new HttpException(
        `Error obteniendo información del certificado: ${error.message}`,
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
        message: isValid ? 'Certificado válido y vigente' : 'Certificado no válido'
      };
    } catch (error) {
      throw new HttpException(
        `Error validando certificado: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
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
          'Se requiere la contraseña del certificado en el body',
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
  // ========== NUEVOS ENDPOINTS ==========

  /**
   * NUEVO: Subir ZIP con XMLs para procesamiento masivo
   */
  @Post('upload-zip')
  @UseInterceptors(FileInterceptor('file'))
  async uploadZip(
    @UploadedFile() file: any,
    @CurrentUser() user: User
  ) {
    if (!file) {
      throw new HttpException('No se recibió archivo', HttpStatus.BAD_REQUEST);
    }

    this.logger.log(`📦 Recibido ZIP: ${file.originalname} (${file.size} bytes)`);

    return await this.cfdiService.processBatchZip(
      file,
      user.uid,
      'free' // O user.tier si tienes ese campo
    );
  }

  /**
   * NUEVO: Obtener estado de procesamiento de batch
   */
  @Get('batch/:batchId/status')
  async getBatchStatus(
    @Param('batchId') batchId: string,
    @CurrentUser() user: User
  ) {
    return await this.cfdiService.getBatchStatus(batchId, user.uid);
  }

  /**
   * NUEVO: Cancelar CFDI
   */
  @Post(':id/cancelar')
  async cancelarCfdi(
    @Param('id') id: string,
    @Body() body: { motivo: string; uuidSustitucion?: string },
    @CurrentUser() user: User,
    @Req() req: RequestWithUser
  ) {
    const firebaseToken = this.extractFirebaseToken(req);

    return await this.cfdiService.cancelarCfdi(
      id,
      body.motivo,
      body.uuidSustitucion || null,
      user.uid,
      firebaseToken
    );
  }

  /**
   * NUEVO: Reenviar email de CFDI
   */
  @Post(':id/reenviar-email')
  async reenviarEmail(
    @Param('id') id: string,
    @CurrentUser() user: User
  ) {
    return await this.cfdiService.reenviarEmail(id, user.uid);
  }

  /**
   * NUEVO: Regenerar PDF de CFDI
   */
  @Post(':id/regenerar-pdf')
  async regenerarPDF(
    @Param('id') id: string,
    @Body() body: { templateType?: string },
    @CurrentUser() user: User
  ) {
    return await this.cfdiService.regenerarPDF(
      id,
      user.uid,
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
  // 🔒 Validar token de servicio
  const serviceToken = req.headers.authorization?.replace('Bearer ', '');
  
  if (serviceToken !== process.env.SERVICE_TOKEN) {
    throw new HttpException('No autorizado', HttpStatus.UNAUTHORIZED);
  }

  // Delegar al servicio
  await this.cfdiService.internalUpdateCfdi(id, updateData);

  return {
    success: true,
    message: 'CFDI actualizado correctamente'
  };
}
}