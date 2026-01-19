export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    content: string | Buffer;
    contentType: string;
  }>;
  replyTo?: string;
}

export interface EmailResult {
  messageId: string;
  provider: string;
  success: boolean;
}

export interface IEmailProvider {
  send(options: EmailOptions): Promise<EmailResult>;
}