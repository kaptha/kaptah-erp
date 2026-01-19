import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmailLog } from './entities/email-log.entity';
import { ScheduledEmail } from './entities/scheduled-email.entity';
import { SendDocumentDto } from './dto/send-document.dto';
import { ScheduleReminderDto } from './dto/schedule-reminder.dto';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    @InjectQueue('email') private emailQueue: Queue,
    @InjectRepository(EmailLog)
    private emailLogRepository: Repository<EmailLog>,
    @InjectRepository(ScheduledEmail)
    private scheduledEmailRepository: Repository<ScheduledEmail>,
  ) {}

  async sendDocument(
    sendDocumentDto: SendDocumentDto,
  ): Promise<{ jobId: string; logId: string }> {
    this.logger.log(
      `Queueing email for ${sendDocumentDto.recipient} - Type: ${sendDocumentDto.documentType}`,
    );

    // 1. Crear log en la base de datos
    const emailLog = this.emailLogRepository.create({
      userId: sendDocumentDto.userId,
      organizationId: sendDocumentDto.organizationId,
      emailType: sendDocumentDto.documentType,
      recipient: sendDocumentDto.recipient,
      subject: this.generateSubject(sendDocumentDto),
      templateUsed: sendDocumentDto.documentType,
      status: 'queued',
      provider: 'sendgrid',
      metadata: {
        documentId: sendDocumentDto.documentId,
        ...sendDocumentDto.metadata,
      },
    });

    await this.emailLogRepository.save(emailLog);

    // 2. Agregar a la cola de procesamiento
    const job = await this.emailQueue.add(
      'send-document',
      {
        ...sendDocumentDto,
        emailLogId: emailLog.id,
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: false,
        removeOnFail: false,
      },
    );

    this.logger.log(`Email queued with job ID: ${job.id}`);

    return {
      jobId: job.id.toString(),
      logId: emailLog.id,
    };
  }

  async scheduleReminder(
    scheduleReminderDto: ScheduleReminderDto,
  ): Promise<{ scheduledId: string }> {
    this.logger.log(
      `Scheduling reminder for ${scheduleReminderDto.recipient} at ${scheduleReminderDto.scheduledFor}`,
    );

    const scheduledEmail = this.scheduledEmailRepository.create({
      userId: scheduleReminderDto.userId,
      organizationId: scheduleReminderDto.organizationId,
      emailType: 'payment_reminder',
      recipient: scheduleReminderDto.recipient,
      subject: `Recordatorio de pago - Factura ${scheduleReminderDto.reminderData.invoiceFolio}`,
      templateData: {
        invoiceId: scheduleReminderDto.invoiceId,
        ...scheduleReminderDto.reminderData,
      },
      scheduledFor: new Date(scheduleReminderDto.scheduledFor),
      recurrence: scheduleReminderDto.recurrence || null,
      status: 'pending',
    });

    await this.scheduledEmailRepository.save(scheduledEmail);

    this.logger.log(`Reminder scheduled with ID: ${scheduledEmail.id}`);

    return {
      scheduledId: scheduledEmail.id,
    };
  }

  async getEmailStatus(logId: string): Promise<EmailLog> {
    return this.emailLogRepository.findOne({
      where: { id: logId },
      relations: ['tracking', 'attachments'],
    });
  }

  async getEmailHistory(
    userId: string,
    organizationId: string,
    filters?: {
      emailType?: string;
      status?: string;
      startDate?: string;
      endDate?: string;
      limit?: number;
      offset?: number;
    },
  ) {
    const query = this.emailLogRepository
      .createQueryBuilder('email')
      .where('email.userId = :userId', { userId })
      .andWhere('email.organizationId = :organizationId', { organizationId });

    if (filters?.emailType) {
      query.andWhere('email.emailType = :emailType', {
        emailType: filters.emailType,
      });
    }

    if (filters?.status) {
      query.andWhere('email.status = :status', { status: filters.status });
    }

    if (filters?.startDate) {
      query.andWhere('email.createdAt >= :startDate', {
        startDate: filters.startDate,
      });
    }

    if (filters?.endDate) {
      query.andWhere('email.createdAt <= :endDate', {
        endDate: filters.endDate,
      });
    }

    const [data, total] = await query
      .orderBy('email.createdAt', 'DESC')
      .take(filters?.limit || 50)
      .skip(filters?.offset || 0)
      .getManyAndCount();

    return {
      data,
      total,
      limit: filters?.limit || 50,
      offset: filters?.offset || 0,
    };
  }

  async cancelScheduledEmail(scheduledId: string): Promise<void> {
    await this.scheduledEmailRepository.update(scheduledId, {
      status: 'cancelled',
    });

    this.logger.log(`Scheduled email ${scheduledId} cancelled`);
  }

  private generateSubject(dto: SendDocumentDto): string {
    const subjects = {
      invoice: `Factura ${dto.documentData.folio}`,
      quotation: `Cotización ${dto.documentData.folio}`,
      delivery_note: `Remisión ${dto.documentData.folio}`,
      payment_reminder: `Recordatorio de pago - Factura ${dto.documentData.folio}`,
      sale_order: `Orden de Venta ${dto.documentData.folio}`,
    };

    return subjects[dto.documentType] || 'Documento';
  }
  
}