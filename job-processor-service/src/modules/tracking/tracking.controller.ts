import {
  Controller,
  Post,
  Body,
  Headers,
  Logger,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { TrackingService } from './tracking.service';

@Controller('tracking')
export class TrackingController {
  private readonly logger = new Logger(TrackingController.name);

  constructor(private readonly trackingService: TrackingService) {}

  // Webhook de SendGrid
  @Post('sendgrid')
  @HttpCode(HttpStatus.OK)
  async sendgridWebhook(
    @Body() events: any[],
    @Headers('user-agent') userAgent: string,
  ) {
    this.logger.log(`Received ${events.length} events from SendGrid`);

    for (const event of events) {
      try {
        await this.trackingService.recordEvent({
          providerMessageId: event.sg_message_id,
          eventType: event.event,
          eventData: event,
          ipAddress: event.ip,
          userAgent,
        });
      } catch (error) {
        this.logger.error(
          `Error processing SendGrid event: ${error.message}`,
        );
      }
    }

    return { received: true };
  }

  // Webhook de Resend
  @Post('resend')
  @HttpCode(HttpStatus.OK)
  async resendWebhook(
    @Body() event: any,
    @Headers('user-agent') userAgent: string,
  ) {
    this.logger.log(`Received event from Resend: ${event.type}`);

    try {
      await this.trackingService.recordEvent({
        providerMessageId: event.data.email_id,
        eventType: event.type,
        eventData: event.data,
        userAgent,
      });
    } catch (error) {
      this.logger.error(`Error processing Resend event: ${error.message}`);
    }

    return { received: true };
  }
}