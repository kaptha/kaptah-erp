import { Processor, Process, OnQueueFailed } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmailLog } from './entities/email-log.entity';
import { EmailAttachment } from './entities/email-attachment.entity';
import { SendgridService } from '../providers/sendgrid.service';
import { ResendService } from '../providers/resend.service';
import { TemplatesService } from '../templates/templates.service';
import { SendDocumentDto } from './dto/send-document.dto';

@Processor('email')
export class EmailProcessor {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(
    @InjectRepository(EmailLog)
    private emailLogRepository: Repository<EmailLog>,
    @InjectRepository(EmailAttachment)
    private emailAttachmentRepository: Repository<EmailAttachment>,
    private sendgridService: SendgridService,
    private resendService: ResendService,
    private templatesService: TemplatesService,
  ) {}

  @Process('send-document')
  async handleSendDocument(job: Job) {
    const { emailLogId, ...data }: SendDocumentDto & { emailLogId: string } =
      job.data;

    this.logger.log(
      `Processing email job ${job.id} for ${data.recipient} - Type: ${data.documentType}`,
    );

    try {
       this.logger.log(`Processing email job ${job.id} for ${job.data.recipient} - Type: ${job.data.documentType}`);
    // Extraer datos del documento
    const templateData = {
      ...job.data.documentData,
      customMessage: job.data.customMessage,
      recipientName: job.data.recipientName,
    };

    // 🔍 DEBUG: Ver si companyLogo está en los datos
    this.logger.log(`🎨 companyLogo en templateData: ${templateData.companyLogo || 'NO DISPONIBLE ❌'}`);
    this.logger.log(`📋 Todos los datos del template:`, JSON.stringify(templateData, null, 2));
    // 🔍 DEBUG: Ver todos los datos que llegan
    this.logger.debug('📧 Email job data completo:');
    this.logger.debug(JSON.stringify(job.data, null, 2));
    this.logger.debug('📧 documentData específico:');
    this.logger.debug(JSON.stringify(job.data.documentData, null, 2));
      // 1. Renderizar template
      const htmlContent = await this.templatesService.render(
        data.documentType,
        {
          ...data.documentData,
          recipientName: data.recipientName,
          customMessage: data.customMessage,
        },
      );

      // 2. Preparar attachments
      const attachments = data.attachments?.map((att) => ({
        filename: att.filename,
        content: att.content, // Ya viene en base64
        contentType: att.contentType,
      }));

      // 3. Intentar enviar con SendGrid primero
      let result;
      let provider = 'sendgrid';

      try {
        result = await this.sendgridService.send({
          to: data.recipient,
          subject: this.generateSubject(data),
          html: htmlContent,
          attachments,
        });

        this.logger.log(`Email sent via SendGrid: ${result.messageId}`);
      } catch (sendgridError) {
        this.logger.warn(
          `SendGrid failed: ${sendgridError.message}. Trying Resend...`,
        );

        // Fallback a Resend
        provider = 'resend';
        result = await this.resendService.send({
          to: data.recipient,
          subject: this.generateSubject(data),
          html: htmlContent,
          attachments,
        });

        this.logger.log(`Email sent via Resend: ${result.messageId}`);
      }

      // 4. Guardar attachments en la BD
      if (attachments && attachments.length > 0) {
        for (const att of attachments) {
          const attachment = this.emailAttachmentRepository.create({
            emailLogId,
            filename: att.filename,
            mimeType: att.contentType,
            fileSize: Buffer.from(att.content, 'base64').length,
          });

          await this.emailAttachmentRepository.save(attachment);
        }
      }

      // 5. Actualizar log como enviado
      await this.emailLogRepository.update(emailLogId, {
        status: 'sent',
        provider,
        providerMessageId: result.messageId,
        sentAt: new Date(),
      });

      this.logger.log(
        `Email processed successfully - Job: ${job.id}, MessageId: ${result.messageId}`,
      );

      return { success: true, messageId: result.messageId };
    } catch (error) {
      this.logger.error(
        `Failed to send email - Job: ${job.id}: ${error.message}`,
        error.stack,
      );

      // Actualizar log con error
      await this.emailLogRepository.update(emailLogId, {
        status: 'failed',
        errorMessage: error.message,
        retryCount: () => 'retry_count + 1',
      });

      throw error; // Bull manejará los reintentos
    }
  }

  @OnQueueFailed()
  async handleFailed(job: Job, error: Error) {
    this.logger.error(
      `Job ${job.id} failed after ${job.attemptsMade} attempts: ${error.message}`,
    );

    const { emailLogId } = job.data;

    await this.emailLogRepository.update(emailLogId, {
      status: 'failed',
      errorMessage: `Failed after ${job.attemptsMade} attempts: ${error.message}`,
    });
  }

  private generateSubject(data: SendDocumentDto): string {
    const subjects = {
      invoice: `Factura ${data.documentData.folio}`,
      quotation: `Cotización ${data.documentData.folio}`,
      delivery_note: `Remisión ${data.documentData.folio}`,
      payment_reminder: `Recordatorio de pago - Factura ${data.documentData.folio}`,
      sale_order: `Orden de Venta ${data.documentData.folio}`,
    };

    return subjects[data.documentType] || 'Documento';
  }
}