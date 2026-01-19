import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { ScheduledEmail } from '../email/entities/scheduled-email.entity';
import { EmailService } from '../email/email.service';
import { DocumentType } from '../email/dto/send-document.dto';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    @InjectRepository(ScheduledEmail)
    private scheduledEmailRepository: Repository<ScheduledEmail>,
    private emailService: EmailService,
  ) {}

  // Ejecutar cada 5 minutos
  @Cron(CronExpression.EVERY_5_MINUTES)
async processScheduledEmails() {
  this.logger.log('Processing scheduled emails...');

  const now = new Date();

  // Obtener emails programados que deben enviarse
  const scheduledEmails = await this.scheduledEmailRepository.find({
    where: {
      status: 'pending',
      scheduledFor: LessThanOrEqual(now),
    },
    take: 50, // Procesar máximo 50 por vez
  });

  this.logger.log(`Found ${scheduledEmails.length} emails to process`);

  for (const scheduled of scheduledEmails) {
    try {
      // Asegurar que templateData tenga la estructura correcta
      const documentData = {
        folio: scheduled.templateData.invoiceFolio || scheduled.templateData.folio || 'N/A',
        date: scheduled.templateData.date || new Date().toISOString(),
        total: scheduled.templateData.amount || scheduled.templateData.total || 0,
        currency: scheduled.templateData.currency || 'MXN',
        items: scheduled.templateData.items || [],
        clientName: scheduled.templateData.clientName || '',
        clientRFC: scheduled.templateData.clientRFC || '',
        ...scheduled.templateData, // Agregar el resto de los datos
      };

      // Enviar el email
      await this.emailService.sendDocument({
        userId: scheduled.userId,
        organizationId: scheduled.organizationId,
        recipient: scheduled.recipient,
        documentType: scheduled.emailType as DocumentType,
        documentId: scheduled.templateData.invoiceId || 'N/A',
        documentData,
      });

      // Marcar como enviado
      await this.scheduledEmailRepository.update(scheduled.id, {
        status: 'sent',
        processedAt: new Date(),
      });

      // Si tiene recurrencia, crear el siguiente recordatorio
      if (scheduled.recurrence) {
        await this.createNextRecurrence(scheduled);
      }

      this.logger.log(`Scheduled email ${scheduled.id} processed`);
    } catch (error) {
      this.logger.error(
        `Failed to process scheduled email ${scheduled.id}: ${error.message}`,
      );
    }
  }
}

  private async createNextRecurrence(scheduled: ScheduledEmail) {
    const nextDate = new Date(scheduled.scheduledFor);

    switch (scheduled.recurrence) {
      case 'daily':
        nextDate.setDate(nextDate.getDate() + 1);
        break;
      case 'weekly':
        nextDate.setDate(nextDate.getDate() + 7);
        break;
      case 'monthly':
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
    }

    const nextScheduled = this.scheduledEmailRepository.create({
      ...scheduled,
      id: undefined, // Para que cree un nuevo registro
      scheduledFor: nextDate,
      status: 'pending',
      processedAt: null,
    });

    await this.scheduledEmailRepository.save(nextScheduled);

    this.logger.log(
      `Created next recurrence for ${scheduled.id}, scheduled for ${nextDate}`,
    );
  }
}