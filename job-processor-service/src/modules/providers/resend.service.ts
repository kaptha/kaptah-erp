import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { IEmailProvider, EmailOptions, EmailResult } from './email-provider.interface';

@Injectable()
export class ResendService implements IEmailProvider {
  private readonly logger = new Logger(ResendService.name);
  private resend: Resend;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('resend.apiKey');
    
    if (!apiKey) {
      this.logger.warn('Resend API key not configured');
      return;
    }

    this.resend = new Resend(apiKey);
  }

  async send(options: EmailOptions): Promise<EmailResult> {
    try {
      const fromEmail = this.configService.get<string>('resend.fromEmail');

      const attachments = options.attachments?.map((att) => ({
        filename: att.filename,
        content: Buffer.isBuffer(att.content)
          ? att.content
          : Buffer.from(att.content, 'base64'),
      }));

      const { data, error } = await this.resend.emails.send({
        from: fromEmail,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        replyTo: options.replyTo,
        attachments,
      });

      if (error) {
        throw new Error(`Resend error: ${error.message}`);
      }

      this.logger.log(`Email sent via Resend to ${options.to}`);

      return {
        messageId: data.id,
        provider: 'resend',
        success: true,
      };
    } catch (error) {
      this.logger.error(`Resend error: ${error.message}`, error.stack);
      throw error;
    }
  }
}