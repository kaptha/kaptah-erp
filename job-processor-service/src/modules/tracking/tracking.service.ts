import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmailTracking } from './entities/email-tracking.entity';
import { EmailLog } from '../email/entities/email-log.entity';

@Injectable()
export class TrackingService {
  private readonly logger = new Logger(TrackingService.name);

  constructor(
    @InjectRepository(EmailTracking)
    private trackingRepository: Repository<EmailTracking>,
    @InjectRepository(EmailLog)
    private emailLogRepository: Repository<EmailLog>,
  ) {}

  async recordEvent(data: {
    providerMessageId: string;
    eventType: string;
    eventData?: any;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    // Buscar el email log por provider message id
    const emailLog = await this.emailLogRepository.findOne({
      where: { providerMessageId: data.providerMessageId },
    });

    if (!emailLog) {
      this.logger.warn(
        `Email log not found for provider message id: ${data.providerMessageId}`,
      );
      return;
    }

    // Crear el registro de tracking
    const tracking = this.trackingRepository.create({
      emailLogId: emailLog.id,
      eventType: data.eventType,
      eventData: data.eventData,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
    });

    await this.trackingRepository.save(tracking);

    // Actualizar el status del email log si es necesario
    if (data.eventType === 'bounced' || data.eventType === 'spam_report') {
      await this.emailLogRepository.update(emailLog.id, {
        status: data.eventType,
      });
    }

    this.logger.log(
      `Tracking event recorded: ${data.eventType} for email ${emailLog.id}`,
    );
  }

  async getTrackingByEmailLog(emailLogId: string): Promise<EmailTracking[]> {
    return this.trackingRepository.find({
      where: { emailLogId },
      order: { createdAt: 'ASC' },
    });
  }
}