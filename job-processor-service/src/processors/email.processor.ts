import { Processor, Process, OnQueueCompleted, OnQueueFailed } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger, Injectable } from '@nestjs/common';
import { QueueName } from '../config/queue.config';
import { MailerService } from '@nestjs-modules/mailer';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

interface EmailJob {
  to: string | string[];
  subject: string;
  template: string;
  context?: any;
  attachments?: Array<{
    filename: string;
    path?: string;
    content?: Buffer | string;
    contentType?: string;
  }>;
  // Datos adicionales para tracking
  userId: string;
  empresaId: string;
  relatedEntityType: 'cfdi' | 'nota-venta' | 'cotizacion' | 'orden-venta' | 'complemento-pago';
  relatedEntityId: string;
  priority?: number;
}

@Processor(QueueName.EMAIL)
export class EmailProcessor {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(
    private readonly mailerService: MailerService,
    @InjectQueue(QueueName.NOTIFICATION) private notificationQueue: Queue,
    // private readonly emailLogService: EmailLogService,
  ) {}

  @Process({ 
    name: 'enviar-email', 
    concurrency: 10 // 10 emails en paralelo
  })
  async sendEmail(job: Job<EmailJob>): Promise<any> {
    const { 
      to, 
      subject, 
      template, 
      context, 
      attachments, 
      userId, 
      empresaId,
      relatedEntityType,
      relatedEntityId 
    } = job.data;

    this.logger.log(`Enviando email: ${subject} a ${to}`);

    try {
      // 1. Si hay attachments con path, esperar a que estén listos
      const processedAttachments = await this.processAttachments(attachments, relatedEntityId);

      // 2. Enviar email
      const result = await this.mailerService.sendMail({
        to,
        subject,
        template,
        context: {
          ...context,
          // Variables globales disponibles en todos los templates
          appUrl: process.env.APP_URL,
          year: new Date().getFullYear()
        },
        attachments: processedAttachments
      });

      // 3. Guardar log de envío
      await this.saveEmailLog({
        to: Array.isArray(to) ? to.join(',') : to,
        subject,
        template,
        userId,
        empresaId,
        relatedEntityType,
        relatedEntityId,
        status: 'enviado',
        messageId: result.messageId,
        sentAt: new Date()
      });

      // 4. Enviar notificación in-app (opcional)
      await this.notificationQueue.add('email-enviado', {
        userId,
        empresaId,
        entityType: relatedEntityType,
        entityId: relatedEntityId,
        emailTo: to
      }, { priority: 10 }); // Baja prioridad

      return {
        success: true,
        messageId: result.messageId,
        to
      };

    } catch (error) {
      this.logger.error(`Error enviando email: ${error.message}`, error.stack);

      // Guardar log de fallo
      await this.saveEmailLog({
        to: Array.isArray(to) ? to.join(',') : to,
        subject,
        template,
        userId,
        empresaId,
        relatedEntityType,
        relatedEntityId,
        status: 'fallido',
        error: error.message,
        failedAt: new Date()
      });

      throw error; // Re-lanzar para que BullMQ reintente
    }
  }
private async sendEmailInternal(data: EmailJob): Promise<any> {
    const { 
      to, 
      subject, 
      template, 
      context, 
      attachments, 
      userId, 
      empresaId,
      relatedEntityType,
      relatedEntityId 
    } = data;

    this.logger.log(`Enviando email interno: ${subject} a ${to}`);

    try {
      // 1. Procesar attachments
      const processedAttachments = await this.processAttachments(attachments, relatedEntityId);

      // 2. Enviar email
      const result = await this.mailerService.sendMail({
        to,
        subject,
        template,
        context: {
          ...context,
          appUrl: process.env.APP_URL,
          year: new Date().getFullYear()
        },
        attachments: processedAttachments
      });

      // 3. Guardar log
      await this.saveEmailLog({
        to: Array.isArray(to) ? to.join(',') : to,
        subject,
        template,
        userId,
        empresaId,
        relatedEntityType,
        relatedEntityId,
        status: 'enviado',
        messageId: result.messageId,
        sentAt: new Date()
      });

      // 4. Notificar (opcional)
      await this.notificationQueue.add('email-enviado', {
        userId,
        empresaId,
        entityType: relatedEntityType,
        entityId: relatedEntityId,
        emailTo: to
      }, { priority: 10 });

      return {
        success: true,
        messageId: result.messageId,
        to
      };

    } catch (error) {
      this.logger.error(`Error enviando email: ${error.message}`, error.stack);

      await this.saveEmailLog({
        to: Array.isArray(to) ? to.join(',') : to,
        subject,
        template,
        userId,
        empresaId,
        relatedEntityType,
        relatedEntityId,
        status: 'fallido',
        error: error.message,
        failedAt: new Date()
      });

      throw error;
    }
  }
 @Process({ 
  name: 'enviar-email-batch', 
  concurrency: 2 
})
async sendBatchEmails(job: Job<{ emails: EmailJob[] }>): Promise<any> {
  const { emails } = job.data; // 👈 Ahora TypeScript sabe que es EmailJob[]
  
  this.logger.log(`Enviando batch de ${emails.length} emails`);

  const results = {
    total: emails.length,
    exitosos: 0,
    fallidos: 0,
    detalles: []
  };

  const chunks = this.chunkArray(emails, 50);

  for (const chunk of chunks) {
    const promises = chunk.map((emailData: EmailJob) => 
      this.sendEmailInternal(emailData)
        .then(result => {
          results.exitosos++;
          return { success: true, to: emailData.to };
        })
        .catch((error: Error) => {
          results.fallidos++;
          return { success: false, to: emailData.to, error: error.message };
        })
    );

    const chunkResults = await Promise.allSettled(promises);
    results.detalles.push(...chunkResults);

    await this.sleep(1000);
  }

  return results;
}
  // Enviar email con nota de venta
  @Process({ name: 'enviar-nota-venta', concurrency: 5 })
  async sendSaleNote(job: Job): Promise<any> {
    const { notaId, clienteEmail } = job.data;

    // 1. Esperar a que el PDF esté listo (con timeout)
    const pdfPath = await this.waitForPDF(notaId, 'nota-venta', 30000);

    if (!pdfPath) {
      throw new Error(`PDF de nota ${notaId} no generado en tiempo esperado`);
    }

    // 2. Obtener datos de la nota
    const nota = await this.getSaleNoteData(notaId);

    // 3. Enviar email
    return await this.sendEmail({
      data: {
        to: clienteEmail,
        subject: `Nota de Venta #${nota.folio} - ${nota.empresaNombre}`,
        template: 'nota-venta',
        context: {
          folio: nota.folio,
          fecha: nota.fecha,
          cliente: nota.clienteNombre,
          total: nota.total,
          empresaNombre: nota.empresaNombre
        },
        attachments: [
          {
            filename: `nota-venta-${nota.folio}.pdf`,
            path: pdfPath
          }
        ],
        userId: nota.userId,
        empresaId: nota.empresaId,
        relatedEntityType: 'nota-venta',
        relatedEntityId: notaId
      }
    } as Job<EmailJob>);
  }

  // Enviar CFDI timbrado
  @Process({ name: 'enviar-cfdi', concurrency: 5 })
  async sendCFDI(job: Job): Promise<any> {
    const { cfdiId, clienteEmail } = job.data;

    // 1. Esperar PDF y XML
    const [pdfPath, xmlPath] = await Promise.all([
      this.waitForPDF(cfdiId, 'cfdi', 30000),
      this.waitForXML(cfdiId, 30000)
    ]);

    if (!pdfPath || !xmlPath) {
      throw new Error(`Archivos de CFDI ${cfdiId} no están listos`);
    }

    // 2. Obtener datos del CFDI
    const cfdi = await this.getCFDIData(cfdiId);

    // 3. Enviar email
    return await this.sendEmail({
      data: {
        to: clienteEmail,
        subject: `Factura Electrónica ${cfdi.serie}-${cfdi.folio} - ${cfdi.emisorNombre}`,
        template: 'cfdi-timbrado',
        context: {
          serie: cfdi.serie,
          folio: cfdi.folio,
          uuid: cfdi.uuid,
          fecha: cfdi.fecha,
          cliente: cfdi.receptorNombre,
          total: cfdi.total,
          emisorNombre: cfdi.emisorNombre
        },
        attachments: [
          {
            filename: `${cfdi.uuid}.pdf`,
            path: pdfPath
          },
          {
            filename: `${cfdi.uuid}.xml`,
            path: xmlPath
          }
        ],
        userId: cfdi.userId,
        empresaId: cfdi.empresaId,
        relatedEntityType: 'cfdi',
        relatedEntityId: cfdiId
      }
    } as Job<EmailJob>);
  }

  // Enviar resumen de batch procesado
  @Process({ name: 'enviar-resumen-batch', concurrency: 2 })
  async sendBatchSummary(job: Job): Promise<any> {
    const { userId, batchId, stats } = job.data;

    // Obtener datos del usuario
    const user = await this.getUserData(userId);

    return await this.sendEmail({
      data: {
        to: user.email,
        subject: `Procesamiento de XMLs completado - Batch ${batchId}`,
        template: 'batch-summary',
        context: {
          userName: user.nombre,
          batchId,
          total: stats.total,
          exitosos: stats.exitosos,
          fallidos: stats.fallidos,
          porcentajeExito: ((stats.exitosos / stats.total) * 100).toFixed(2),
          detalles: stats.detalles
        },
        userId,
        empresaId: user.empresaId,
        relatedEntityType: 'cfdi',
        relatedEntityId: batchId
      }
    } as Job<EmailJob>);
  }

  // Recordatorio de pago
  @Process({ name: 'recordatorio-pago', concurrency: 10 })
  async sendPaymentReminder(job: Job): Promise<any> {
    const { cxcId, clienteEmail, diasVencido } = job.data;

    const cxc = await this.getCxCData(cxcId);

    return await this.sendEmail({
      data: {
        to: clienteEmail,
        subject: `Recordatorio de Pago - Factura ${cxc.folio}`,
        template: 'recordatorio-pago',
        context: {
          folio: cxc.folio,
          fechaVencimiento: cxc.fechaVencimiento,
          diasVencido,
          monto: cxc.saldo,
          cliente: cxc.clienteNombre,
          empresaNombre: cxc.empresaNombre
        },
        userId: cxc.userId,
        empresaId: cxc.empresaId,
        relatedEntityType: 'cfdi',
        relatedEntityId: cxc.cfdiId
      }
    } as Job<EmailJob>);
  }

  // ========== MÉTODOS AUXILIARES ==========

  private async processAttachments(attachments: any[], entityId: string): Promise<any[]> {
    if (!attachments || attachments.length === 0) return [];

    return await Promise.all(
      attachments.map(async (att) => {
        // Si tiene path, verificar que exista
        if (att.path) {
          const fs = require('fs').promises;
          try {
            await fs.access(att.path);
            return att;
          } catch {
            this.logger.warn(`Archivo no encontrado: ${att.path}`);
            return null;
          }
        }
        return att;
      })
    ).then(results => results.filter(r => r !== null));
  }

  private async waitForPDF(
    entityId: string, 
    entityType: string, 
    timeout: number
  ): Promise<string | null> {
    // Implementar lógica para esperar que el PDF esté listo
    // Puede ser polling a Redis o esperar evento
    const startTime = Date.now();
    const checkInterval = 1000; // Check cada segundo

    while (Date.now() - startTime < timeout) {
      const pdfPath = await this.checkPDFExists(entityId, entityType);
      if (pdfPath) return pdfPath;
      
      await this.sleep(checkInterval);
    }

    return null;
  }

  private async waitForXML(entityId: string, timeout: number): Promise<string | null> {
    // Similar a waitForPDF
    return `/path/to/xmls/${entityId}.xml`; // Mock
  }

  private async checkPDFExists(entityId: string, entityType: string): Promise<string | null> {
    // Verificar en filesystem o S3
    const expectedPath = `/path/to/pdfs/${entityType}/${entityId}.pdf`;
    
    const fs = require('fs').promises;
    try {
      await fs.access(expectedPath);
      return expectedPath;
    } catch {
      return null;
    }
  }

  private async saveEmailLog(data: any): Promise<void> {
    // Guardar en DB usando EmailLogService
    this.logger.log(`Email log guardado: ${data.status} - ${data.to}`);
  }

  private async getSaleNoteData(notaId: string): Promise<any> {
    // Obtener desde sales-api o directamente de DB
    return {
      folio: 'NV-001',
      fecha: new Date(),
      clienteNombre: 'Cliente Test',
      total: 1000,
      empresaNombre: 'Mi Empresa',
      userId: 'user-123',
      empresaId: 'emp-123'
    }; // Mock
  }

  private async getCFDIData(cfdiId: string): Promise<any> {
    return {
      serie: 'A',
      folio: '123',
      uuid: '12345678-1234-1234-1234-123456789012',
      fecha: new Date(),
      receptorNombre: 'Cliente Test',
      total: 1160,
      emisorNombre: 'Mi Empresa',
      userId: 'user-123',
      empresaId: 'emp-123'
    }; // Mock
  }

  private async getCxCData(cxcId: string): Promise<any> {
    return {
      folio: 'A-123',
      fechaVencimiento: new Date(),
      saldo: 1160,
      clienteNombre: 'Cliente Test',
      empresaNombre: 'Mi Empresa',
      userId: 'user-123',
      empresaId: 'emp-123',
      cfdiId: 'cfdi-123'
    }; // Mock
  }

  private async getUserData(userId: string): Promise<any> {
    return {
      email: 'user@example.com',
      nombre: 'Usuario Test',
      empresaId: 'emp-123'
    }; // Mock
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  @OnQueueCompleted()
  onCompleted(job: Job, result: any) {
    this.logger.log(`✓ Email enviado: Job ${job.id} - ${result.to}`);
  }

  @OnQueueFailed()
  onFailed(job: Job, error: Error) {
    this.logger.error(`✗ Email falló: Job ${job.id} - ${error.message}`);
  }
}