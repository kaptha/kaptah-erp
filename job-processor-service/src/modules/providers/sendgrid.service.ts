import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as SendGrid from '@sendgrid/mail';
import { IEmailProvider, EmailOptions, EmailResult } from './email-provider.interface';

@Injectable()
export class SendgridService implements IEmailProvider {
  private readonly logger = new Logger(SendgridService.name);

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('sendgrid.apiKey');
    
    if (!apiKey) {
      this.logger.warn('SendGrid API key not configured');
      return;
    }

    SendGrid.setApiKey(apiKey);
  }

  async send(options: EmailOptions): Promise<EmailResult> {
    try {
      const fromEmail = this.configService.get<string>('sendgrid.fromEmail');
      const fromName = this.configService.get<string>('sendgrid.fromName');

      const msg: SendGrid.MailDataRequired = {
        to: options.to,
        from: {
          email: fromEmail,
          name: fromName,
        },
        subject: options.subject,
        html: options.html,
        text: options.text,
        replyTo: options.replyTo,
      };

      if (options.attachments && options.attachments.length > 0) {
        msg.attachments = options.attachments.map((att) => ({
          filename: att.filename,
          content: Buffer.isBuffer(att.content)
            ? att.content.toString('base64')
            : att.content,
          type: att.contentType,
          disposition: 'attachment',
        }));
      }

      const [response] = await SendGrid.send(msg);

      this.logger.log(`Email sent via SendGrid to ${options.to}`);

      return {
        messageId: response.headers['x-message-id'] as string,
        provider: 'sendgrid',
        success: true,
      };
    } catch (error) {
      this.logger.error(`SendGrid error: ${error.message}`, error.stack);
      throw error;
    }
  }
}