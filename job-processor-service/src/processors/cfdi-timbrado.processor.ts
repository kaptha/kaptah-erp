import { Processor, Process, OnQueueCompleted, OnQueueFailed } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { QueueName } from '../config/queue.config';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { HttpService } from '@nestjs/axios';
import { AxiosResponse } from 'axios';
import { firstValueFrom } from 'rxjs';

interface TimbradoJob {
  cfdiId: string;
  xmlSinTimbrar: string; // 👈 Ya viene firmado desde sales-api
  userId: string;
  empresaId: string;
  certificadoId: string;
  csdPassword?: string; // 👈 AGREGAR si lo necesitas en el procesador
  priority?: number;
}

@Processor(QueueName.CFDI_TIMBRADO)
export class CfdiTimbradoProcessor {
  private readonly logger = new Logger(CfdiTimbradoProcessor.name);

  constructor(
    private readonly httpService: HttpService,
    @InjectQueue(QueueName.PDF_GENERATION) private pdfQueue: Queue,
    @InjectQueue(QueueName.EMAIL) private emailQueue: Queue,
    @InjectQueue(QueueName.NOTIFICATION) private notificationQueue: Queue,
    @InjectQueue(QueueName.ACCOUNTING) private accountingQueue: Queue,
    // private readonly sifeiService: SifeiService,
    // private readonly cfdiService: CfdiService,
    // private readonly certificadoService: CertificadoService,
  ) {}

 @Process({ 
  name: 'timbrar-cfdi', 
  concurrency: 2 
})
async timbrarCFDI(job: Job<TimbradoJob>): Promise<any> {
  const { cfdiId, xmlSinTimbrar, userId, empresaId, certificadoId, csdPassword } = job.data;

  this.logger.log(`Timbrando CFDI: ${cfdiId}`);

  try {
    // 1. Obtener certificado CSD (si es necesario)
    const certificado = await this.getCertificado(certificadoId);

    // 2. Enviar a PAC SIFEI para timbrado
    const timbradoResponse = await this.enviarAPAC(xmlSinTimbrar, empresaId);

    // 3. Validar respuesta del PAC
    if (!timbradoResponse.success) {
      throw new Error(`Error PAC: ${timbradoResponse.error}`);
    }

    // 4. Extraer UUID y datos del timbre
    const timbreData = this.extractTimbreData(timbradoResponse.xmlTimbrado);

    // 5. 🔥 ACTUALIZAR CFDI EN BD CON EL XML TIMBRADO
    await this.updateCFDI(cfdiId, {
      uuid: timbreData.uuid,
      xml: timbradoResponse.xmlTimbrado, // 👈 AQUÍ se guarda el XML
      fechaTimbrado: new Date(timbreData.fechaTimbrado),
      noCertificadoSAT: timbreData.noCertificadoSAT,
      selloSAT: timbreData.selloSAT,
      selloCFD: timbreData.selloCFD,
      status: 'timbrado', // 👈 Cambiar estado
      updatedAt: new Date(),
    });

    // 6. Guardar XML timbrado en filesystem/S3 (opcional)
    const xmlPath = await this.saveXML(cfdiId, timbradoResponse.xmlTimbrado);

    // 7. Crear jobs secundarios (PDF, Email, CxC)
    await this.createPostTimbradoJobs(cfdiId, userId, empresaId);

    this.logger.log(`✓ CFDI timbrado exitosamente: ${timbreData.uuid}`);

    return {
      success: true,
      cfdiId,
      uuid: timbreData.uuid,
      xmlPath
    };

  } catch (error) {
    this.logger.error(`Error timbrando CFDI ${cfdiId}: ${error.message}`, error.stack);

    // 🔥 Actualizar estado a "error" en la BD
    await this.updateCFDI(cfdiId, {
      status: 'error',
      error_message: error.message,
      updatedAt: new Date(),
    });

    throw error; // Re-lanzar para reintentos de BullMQ
  }
}

// 🔥 MÉTODO PARA ACTUALIZAR CFDI EN SALES-API
private async updateCFDI(cfdiId: string, data: any): Promise<void> {
  try {
    // Opción 1: Llamada HTTP a sales-api
    const response: AxiosResponse = await firstValueFrom(
      this.httpService.patch(
        `${process.env.SALES_API_URL}/cfdi/${cfdiId}/internal-update`,
        data,
        {
          headers: {
            'Authorization': `Bearer ${process.env.SERVICE_AUTH_TOKEN || 'your-service-token'}`,
            'Content-Type': 'application/json'
          }
        }
      )
    );

    this.logger.log(`✓ CFDI ${cfdiId} actualizado en BD`);
  } catch (error) {
    this.logger.error(`Error actualizando CFDI en BD: ${error.message}`);
    throw error;
  }
}

  @Process({ 
    name: 'cancelar-cfdi', 
    concurrency: 2 
  })
  async cancelarCFDI(job: Job): Promise<any> {
    const { cfdiId, motivo, uuidSustitucion, userId, empresaId, certificadoId } = job.data;

    this.logger.log(`Cancelando CFDI: ${cfdiId}`);

    try {
      // 1. Obtener CFDI y validar que puede ser cancelado
      const cfdi = await this.getCFDI(cfdiId);
      
      if (cfdi.status === 'cancelado') {
        throw new Error('CFDI ya está cancelado');
      }

      if (!cfdi.uuid) {
        throw new Error('CFDI no tiene UUID, no puede ser cancelado');
      }

      // 2. Obtener certificado
      const certificado = await this.getCertificado(certificadoId);

      // 3. Preparar solicitud de cancelación
      const cancelacionRequest = {
        uuid: cfdi.uuid,
        motivo,
        uuidSustitucion: uuidSustitucion || null,
        rfcEmisor: cfdi.emisorRfc,
        rfcReceptor: cfdi.receptorRfc
      };

      // 4. Enviar cancelación al PAC
      const cancelacionResponse = await this.enviarCancelacionAPAC(
        cancelacionRequest,
        certificado,
        empresaId
      );

      if (!cancelacionResponse.success) {
        throw new Error(`Error PAC: ${cancelacionResponse.error}`);
      }

      // 5. Actualizar CFDI en DB
      await this.updateCFDI(cfdiId, {
        status: 'cancelado',
        fechaCancelacion: new Date(),
        motivoCancelacion: motivo,
        uuidSustitucion,
        acrCancelacion: cancelacionResponse.acuse
      });

      // 6. Si hay UUID de sustitución, relacionar
      if (uuidSustitucion) {
        await this.relacionarCFDISustitucion(cfdi.uuid, uuidSustitucion);
      }

      // 7. Notificar
      await this.notificationQueue.add('cfdi-cancelado', {
        userId,
        empresaId,
        cfdiId,
        uuid: cfdi.uuid
      });

      this.logger.log(`✓ CFDI cancelado: ${cfdi.uuid}`);

      return {
        success: true,
        cfdiId,
        uuid: cfdi.uuid,
        acuse: cancelacionResponse.acuse
      };

    } catch (error) {
      this.logger.error(`Error cancelando CFDI: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Process({ 
    name: 'validar-cfdi-sat', 
    concurrency: 3 
  })
  async validarCFDISAT(job: Job): Promise<any> {
    const { cfdiId, uuid } = job.data;

    try {
      // Consultar estatus en el SAT
      const satStatus = await this.consultarEstatusSAT(uuid);

      // Actualizar en DB
      await this.updateCFDI(cfdiId, {
        estatusSAT: satStatus.estado,
        ultimaValidacionSAT: new Date(),
        esValidoSAT: satStatus.esValido
      });

      return {
        success: true,
        cfdiId,
        uuid,
        estatusSAT: satStatus.estado
      };

    } catch (error) {
      this.logger.error(`Error validando CFDI en SAT: ${error.message}`);
      throw error;
    }
  }

  // ========== MÉTODOS AUXILIARES ==========

  private async getCertificado(certificadoId: string): Promise<any> {
    // Obtener desde cert-vault-service
    // const response = await this.httpService.get(
    //   `http://cert-vault-service:3004/certificates/${certificadoId}`
    // );
    return {
      id: certificadoId,
      cerPem: '-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----',
      keyPem: '-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----',
      password: 'password123'
    }; // Mock
  }

  private async firmarXML(xml: string, certificado: any): Promise<string> {
    // Usar librería de firma digital (XMLSec, node-forge, etc.)
    // Implementar firma XML según especificaciones SAT
    this.logger.log('Firmando XML con CSD...');
    return xml; // Mock - debería retornar XML firmado
  }

  private async enviarAPAC(xmlFirmado: string, empresaId: string): Promise<any> {
  try {
    const pacCredentials = await this.getPACCredentials(empresaId);

    // 👇 AGREGAR TIPADO
    const response: AxiosResponse = await firstValueFrom(
      this.httpService.post(
        `${pacCredentials.url}/timbrar`,
        {
          xml: Buffer.from(xmlFirmado).toString('base64'),
          usuario: pacCredentials.usuario,
          password: pacCredentials.password
        },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      )
    );

    if (response.data.success) {
      return {
        success: true,
        xmlTimbrado: Buffer.from(response.data.xml, 'base64').toString('utf-8')
      };
    } else {
      return {
        success: false,
        error: response.data.mensaje || 'Error desconocido del PAC'
      };
    }

  } catch (error) {
    this.logger.error(`Error comunicación con PAC: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

  private extractTimbreData(xmlTimbrado: string): any {
    // Parsear XML y extraer datos del TimbreFiscalDigital
    const xml2js = require('xml2js');
    const parser = new xml2js.Parser();
    
    // Mock - en producción parsear el XML real
    return {
      uuid: '12345678-1234-1234-1234-123456789012',
      fechaTimbrado: new Date().toISOString(),
      noCertificadoSAT: '00001000000407657150',
      selloSAT: 'ABC123...'
    };
  }

  

  private async saveXML(cfdiId: string, xml: string): Promise<string> {
    const fs = require('fs').promises;
    const path = require('path');
    
    const xmlDir = process.env.XML_OUTPUT_DIR || '/tmp/xmls';
    const xmlPath = path.join(xmlDir, 'cfdi', `${cfdiId}.xml`);
    
    await fs.mkdir(path.dirname(xmlPath), { recursive: true });
    await fs.writeFile(xmlPath, xml, 'utf-8');
    
    return xmlPath;
  }

  private async createPostTimbradoJobs(cfdiId: string, userId: string, empresaId: string): Promise<void> {
    // Job 1: Generar PDF
    await this.pdfQueue.add('generar-pdf-cfdi', {
      cfdiId,
      templateType: 'clasico'
    }, { priority: 2 });

    // Job 2: Crear CxC
    await this.accountingQueue.add('crear-cxc', {
      cfdiId,
      userId,
      empresaId
    }, { priority: 1 });

    // Job 3: Enviar email (esperará a que PDF esté listo)
    await this.emailQueue.add('enviar-cfdi', {
      cfdiId,
      clienteEmail: await this.getClienteEmail(cfdiId)
    }, { 
      priority: 3,
      delay: 5000 // Esperar 5 segundos para que PDF esté listo
    });

    // Job 4: Notificación in-app
    await this.notificationQueue.add('cfdi-timbrado', {
      userId,
      empresaId,
      cfdiId
    });
  }

  private async getClienteEmail(cfdiId: string): Promise<string> {
    // Obtener email del receptor del CFDI
    return 'cliente@example.com'; // Mock
  }

  private async getPACCredentials(empresaId: string): Promise<any> {
    // Obtener credenciales del PAC de la empresa
    return {
      url: process.env.PAC_SIFEI_URL || 'https://sifei.com.mx/api',
      usuario: process.env.PAC_USUARIO,
      password: process.env.PAC_PASSWORD
    };
  }

  private async getCFDI(cfdiId: string): Promise<any> {
    // Obtener CFDI de DB
    return {
      id: cfdiId,
      uuid: '12345678-1234-1234-1234-123456789012',
      status: 'timbrado',
      emisorRfc: 'AAA010101AAA',
      receptorRfc: 'XAXX010101000'
    }; // Mock
  }

  private async enviarCancelacionAPAC(request: any, certificado: any, empresaId: string): Promise<any> {
    // Enviar solicitud de cancelación al PAC
    this.logger.log(`Enviando cancelación a PAC: ${request.uuid}`);
    return {
      success: true,
      acuse: 'ACUSE123...'
    }; // Mock
  }

  private async relacionarCFDISustitucion(uuidOriginal: string, uuidSustitucion: string): Promise<void> {
    // Crear relación en DB
    this.logger.log(`Relacionando CFDIs: ${uuidOriginal} -> ${uuidSustitucion}`);
  }

  private async consultarEstatusSAT(uuid: string): Promise<any> {
    // Consultar en web service del SAT
    return {
      estado: 'Vigente',
      esValido: true
    }; // Mock
  }

  @OnQueueCompleted()
  onCompleted(job: Job, result: any) {
    this.logger.log(`✓ Timbrado completado: ${result.uuid || result.cfdiId}`);
  }

  @OnQueueFailed()
  onFailed(job: Job, error: Error) {
    this.logger.error(`✗ Timbrado falló: Job ${job.id} - ${error.message}`);
  }
}