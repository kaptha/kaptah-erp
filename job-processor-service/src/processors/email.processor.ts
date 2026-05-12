import {
  Processor,
  Process,
  OnQueueCompleted,
  OnQueueFailed,
} from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { QueueName } from '../config/queue.config';
import { ResendService } from '../modules/providers/resend.service';
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
  userId: string;
  empresaId: string;
  relatedEntityType:
    | 'cfdi'
    | 'nota-venta'
    | 'cotizacion'
    | 'orden-venta'
    | 'complemento-pago';
  relatedEntityId: string;
  priority?: number;
}

@Processor(QueueName.EMAIL)
export class EmailProcessor {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(
    private readonly resendService: ResendService,
    @InjectQueue(QueueName.NOTIFICATION) private notificationQueue: Queue,
  ) {}

  // ========== GENERADOR DE HTML ==========

  private generateEmailHtml(template: string, context: any): string {
    switch (template) {
      case 'nota-venta':
        return this.generateSaleNoteHtml(context);
      case 'cfdi-timbrado':
        return this.generateCFDIHtml(context);
      case 'batch-summary':
        return this.generateBatchSummaryHtml(context);
        case 'cotizacion':
        return this.generateCotizacionHtml(context);
      case 'recordatorio-pago':
        return this.generatePaymentReminderHtml(context);
        case 'nota-entrega':
        return this.generateDeliveryNoteHtml(context);
      default:
        return this.generateGenericHtml(context);
    }
  }

  private generateSaleNoteHtml(context: any): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0;padding:0;background-color:#f4f4f7;font-family:Arial,Helvetica,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f7;padding:40px 0;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #8e24aa 0%, #667eea 100%);padding:30px 40px;text-align:center;">
                  <h1 style="color:#ffffff;margin:0;font-size:24px;">${context.empresaNombre || 'Kaptah'}</h1>
                </td>
              </tr>
              <!-- Body -->
              <tr>
                <td style="padding:40px;">
                  <h2 style="color:#333333;margin:0 0 20px;">Nota de Venta #${context.folio}</h2>
                  <p style="color:#555555;font-size:15px;line-height:1.6;">
                    Estimado/a <strong>${context.cliente || 'Cliente'}</strong>,
                  </p>
                  <p style="color:#555555;font-size:15px;line-height:1.6;">
                    Adjunto encontrara su nota de venta con los siguientes datos:
                  </p>
                  <!-- Datos -->
                  <table width="100%" cellpadding="8" cellspacing="0" style="margin:20px 0;border:1px solid #e8e8e8;border-radius:6px;">
                    <tr style="background-color:#f8f9fa;">
                      <td style="color:#666;font-size:14px;border-bottom:1px solid #e8e8e8;"><strong>Folio</strong></td>
                      <td style="color:#333;font-size:14px;border-bottom:1px solid #e8e8e8;">${context.folio}</td>
                    </tr>
                    <tr>
                      <td style="color:#666;font-size:14px;border-bottom:1px solid #e8e8e8;"><strong>Fecha</strong></td>
                      <td style="color:#333;font-size:14px;border-bottom:1px solid #e8e8e8;">${context.fecha || new Date().toLocaleDateString('es-MX')}</td>
                    </tr>
                    <tr style="background-color:#f8f9fa;">
                      <td style="color:#666;font-size:14px;"><strong>Total</strong></td>
                      <td style="color:#8e24aa;font-size:18px;font-weight:bold;">$${context.total ? Number(context.total).toLocaleString('es-MX', { minimumFractionDigits: 2 }) : '0.00'} MXN</td>
                    </tr>
                  </table>
                  ${context.customMessage ? `<p style="color:#555555;font-size:15px;line-height:1.6;background:#f8f9fa;padding:15px;border-radius:6px;border-left:4px solid #8e24aa;">${context.customMessage}</p>` : ''}
                  <p style="color:#555555;font-size:14px;line-height:1.6;margin-top:30px;">
                    Si tiene alguna pregunta, no dude en contactarnos.
                  </p>
                </td>
              </tr>
              <!-- Footer -->
              <tr>
                <td style="background-color:#f8f9fa;padding:20px 40px;text-align:center;border-top:1px solid #e8e8e8;">
                  <p style="color:#999999;font-size:12px;margin:0;">
                    Este correo fue enviado por <strong>${context.empresaNombre || 'Kaptah'}</strong>
                  </p>
                  <p style="color:#bbbbbb;font-size:11px;margin:8px 0 0;">
                    Powered by Kaptah &bull; ${new Date().getFullYear()}
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>`;
  }

  private generateCFDIHtml(context: any): string {
    return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="margin:0;padding:0;background-color:#f4f4f7;font-family:Arial,Helvetica,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f7;padding:40px 0;">
        <tr><td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
            <tr><td style="background:linear-gradient(135deg,#8e24aa 0%,#667eea 100%);padding:30px 40px;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:24px;">${context.emisorNombre || 'Kaptah'}</h1>
            </td></tr>
            <tr><td style="padding:40px;">
              <h2 style="color:#333;margin:0 0 20px;">Factura Electronica ${context.serie}-${context.folio}</h2>
              <p style="color:#555;font-size:15px;line-height:1.6;">Estimado/a <strong>${context.cliente || 'Cliente'}</strong>,</p>
              <p style="color:#555;font-size:15px;line-height:1.6;">Adjunto encontrara su CFDI (PDF y XML).</p>
              <table width="100%" cellpadding="8" cellspacing="0" style="margin:20px 0;border:1px solid #e8e8e8;border-radius:6px;">
                <tr style="background-color:#f8f9fa;">
                  <td style="color:#666;font-size:14px;border-bottom:1px solid #e8e8e8;"><strong>UUID</strong></td>
                  <td style="color:#333;font-size:13px;border-bottom:1px solid #e8e8e8;font-family:monospace;">${context.uuid}</td>
                </tr>
                <tr>
                  <td style="color:#666;font-size:14px;border-bottom:1px solid #e8e8e8;"><strong>Fecha</strong></td>
                  <td style="color:#333;font-size:14px;border-bottom:1px solid #e8e8e8;">${context.fecha || ''}</td>
                </tr>
                <tr style="background-color:#f8f9fa;">
                  <td style="color:#666;font-size:14px;"><strong>Total</strong></td>
                  <td style="color:#8e24aa;font-size:18px;font-weight:bold;">$${context.total ? Number(context.total).toLocaleString('es-MX', { minimumFractionDigits: 2 }) : '0.00'} MXN</td>
                </tr>
              </table>
              ${context.customMessage ? `<p style="color:#555;font-size:15px;line-height:1.6;background:#f8f9fa;padding:15px;border-radius:6px;border-left:4px solid #8e24aa;">${context.customMessage}</p>` : ''}
              <p style="color:#555;font-size:14px;line-height:1.6;margin-top:30px;">
                Si tiene alguna pregunta, no dude en contactarnos.
              </p>
            </td></tr>
            <tr><td style="background-color:#f8f9fa;padding:20px 40px;text-align:center;border-top:1px solid #e8e8e8;">
              <p style="color:#999;font-size:12px;margin:0;">Enviado por <strong>${context.emisorNombre || 'Kaptah'}</strong></p>
              <p style="color:#bbb;font-size:11px;margin:8px 0 0;">Powered by Kaptah &bull; ${new Date().getFullYear()}</p>
            </td></tr>
          </table>
        </td></tr>
      </table>
    </body></html>`;
  }

  private generateBatchSummaryHtml(context: any): string {
    return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin:0;padding:0;background-color:#f4f4f7;font-family:Arial,Helvetica,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f7;padding:40px 0;">
        <tr><td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="background-color:#fff;border-radius:8px;overflow:hidden;">
            <tr><td style="background:linear-gradient(135deg,#8e24aa,#667eea);padding:30px 40px;text-align:center;">
              <h1 style="color:#fff;margin:0;">Resumen de Procesamiento</h1>
            </td></tr>
            <tr><td style="padding:40px;">
              <p style="color:#555;font-size:15px;">Hola <strong>${context.userName}</strong>,</p>
              <p style="color:#555;font-size:15px;">El procesamiento del batch <strong>${context.batchId}</strong> ha finalizado:</p>
              <table width="100%" cellpadding="12" cellspacing="0" style="margin:20px 0;">
                <tr><td style="background:#e8f5e9;border-radius:6px;text-align:center;"><strong style="color:#2e7d32;font-size:24px;">${context.exitosos}</strong><br><span style="color:#666;font-size:13px;">Exitosos</span></td>
                <td style="width:10px;"></td>
                <td style="background:#ffebee;border-radius:6px;text-align:center;"><strong style="color:#c62828;font-size:24px;">${context.fallidos}</strong><br><span style="color:#666;font-size:13px;">Fallidos</span></td>
                <td style="width:10px;"></td>
                <td style="background:#e3f2fd;border-radius:6px;text-align:center;"><strong style="color:#1565c0;font-size:24px;">${context.total}</strong><br><span style="color:#666;font-size:13px;">Total</span></td></tr>
              </table>
            </td></tr>
            <tr><td style="background-color:#f8f9fa;padding:20px 40px;text-align:center;border-top:1px solid #e8e8e8;">
              <p style="color:#bbb;font-size:11px;margin:0;">Powered by Kaptah &bull; ${new Date().getFullYear()}</p>
            </td></tr>
          </table>
        </td></tr>
      </table>
    </body></html>`;
  }

  private generatePaymentReminderHtml(context: any): string {
    return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin:0;padding:0;background-color:#f4f4f7;font-family:Arial,Helvetica,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f7;padding:40px 0;">
        <tr><td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="background-color:#fff;border-radius:8px;overflow:hidden;">
            <tr><td style="background:linear-gradient(135deg,#e65100,#ff9800);padding:30px 40px;text-align:center;">
              <h1 style="color:#fff;margin:0;">Recordatorio de Pago</h1>
            </td></tr>
            <tr><td style="padding:40px;">
              <p style="color:#555;font-size:15px;">Estimado/a <strong>${context.cliente}</strong>,</p>
              <p style="color:#555;font-size:15px;">Le recordamos que tiene un saldo pendiente:</p>
              <table width="100%" cellpadding="8" cellspacing="0" style="margin:20px 0;border:1px solid #e8e8e8;border-radius:6px;">
                <tr style="background-color:#f8f9fa;">
                  <td style="color:#666;font-size:14px;border-bottom:1px solid #e8e8e8;"><strong>Factura</strong></td>
                  <td style="color:#333;font-size:14px;border-bottom:1px solid #e8e8e8;">${context.folio}</td>
                </tr>
                <tr>
                  <td style="color:#666;font-size:14px;border-bottom:1px solid #e8e8e8;"><strong>Vencimiento</strong></td>
                  <td style="color:#c62828;font-size:14px;border-bottom:1px solid #e8e8e8;">${context.fechaVencimiento} (${context.diasVencido} dias)</td>
                </tr>
                <tr style="background-color:#f8f9fa;">
                  <td style="color:#666;font-size:14px;"><strong>Saldo</strong></td>
                  <td style="color:#e65100;font-size:18px;font-weight:bold;">$${context.monto ? Number(context.monto).toLocaleString('es-MX', { minimumFractionDigits: 2 }) : '0.00'} MXN</td>
                </tr>
              </table>
              <p style="color:#555;font-size:14px;">Agradecemos su pronta atencion.</p>
            </td></tr>
            <tr><td style="background-color:#f8f9fa;padding:20px 40px;text-align:center;border-top:1px solid #e8e8e8;">
              <p style="color:#999;font-size:12px;margin:0;">Enviado por <strong>${context.empresaNombre}</strong></p>
              <p style="color:#bbb;font-size:11px;margin:8px 0 0;">Powered by Kaptah &bull; ${new Date().getFullYear()}</p>
            </td></tr>
          </table>
        </td></tr>
      </table>
    </body></html>`;
  }
  private generateCotizacionHtml(context: any): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0;padding:0;background-color:#f4f4f7;font-family:Arial,Helvetica,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f7;padding:40px 0;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
              <tr>
                <td style="background: linear-gradient(135deg, #1565c0 0%, #42a5f5 100%);padding:30px 40px;text-align:center;">
                  <h1 style="color:#ffffff;margin:0;font-size:24px;">${context.empresaNombre || 'Kaptah'}</h1>
                </td>
              </tr>
              <tr>
                <td style="padding:40px;">
                  <h2 style="color:#333333;margin:0 0 20px;">Cotizacion ${context.folio}</h2>
                  <p style="color:#555555;font-size:15px;line-height:1.6;">
                    Estimado/a <strong>${context.cliente || 'Cliente'}</strong>,
                  </p>
                  <p style="color:#555555;font-size:15px;line-height:1.6;">
                    Adjunto encontrara su cotizacion con los siguientes datos:
                  </p>
                  <table width="100%" cellpadding="8" cellspacing="0" style="margin:20px 0;border:1px solid #e8e8e8;border-radius:6px;">
                    <tr style="background-color:#f8f9fa;">
                      <td style="color:#666;font-size:14px;border-bottom:1px solid #e8e8e8;"><strong>Folio</strong></td>
                      <td style="color:#333;font-size:14px;border-bottom:1px solid #e8e8e8;">${context.folio}</td>
                    </tr>
                    <tr>
                      <td style="color:#666;font-size:14px;border-bottom:1px solid #e8e8e8;"><strong>Fecha</strong></td>
                      <td style="color:#333;font-size:14px;border-bottom:1px solid #e8e8e8;">${context.fecha}</td>
                    </tr>
                    <tr style="background-color:#f8f9fa;">
                      <td style="color:#666;font-size:14px;border-bottom:1px solid #e8e8e8;"><strong>Valida hasta</strong></td>
                      <td style="color:#333;font-size:14px;border-bottom:1px solid #e8e8e8;">${context.fechaValidez}</td>
                    </tr>
                    <tr>
                      <td style="color:#666;font-size:14px;border-bottom:1px solid #e8e8e8;"><strong>Subtotal</strong></td>
                      <td style="color:#333;font-size:14px;border-bottom:1px solid #e8e8e8;">$${context.subtotal ? Number(context.subtotal).toLocaleString('es-MX', { minimumFractionDigits: 2 }) : '0.00'} ${context.moneda}</td>
                    </tr>
                    <tr style="background-color:#f8f9fa;">
                      <td style="color:#666;font-size:14px;border-bottom:1px solid #e8e8e8;"><strong>Impuestos</strong></td>
                      <td style="color:#333;font-size:14px;border-bottom:1px solid #e8e8e8;">$${context.impuestos ? Number(context.impuestos).toLocaleString('es-MX', { minimumFractionDigits: 2 }) : '0.00'} ${context.moneda}</td>
                    </tr>
                    <tr>
                      <td style="color:#666;font-size:14px;"><strong>Total</strong></td>
                      <td style="color:#1565c0;font-size:18px;font-weight:bold;">$${context.total ? Number(context.total).toLocaleString('es-MX', { minimumFractionDigits: 2 }) : '0.00'} ${context.moneda}</td>
                    </tr>
                  </table>
                  ${context.customMessage ? `<p style="color:#555;font-size:15px;line-height:1.6;background:#f8f9fa;padding:15px;border-radius:6px;border-left:4px solid #1565c0;">${context.customMessage}</p>` : ''}
                  <p style="color:#555;font-size:14px;line-height:1.6;margin-top:30px;">
                    Si tiene alguna pregunta o desea proceder, no dude en contactarnos.
                  </p>
                </td>
              </tr>
              <tr>
                <td style="background-color:#f8f9fa;padding:20px 40px;text-align:center;border-top:1px solid #e8e8e8;">
                  <p style="color:#999;font-size:12px;margin:0;">Este correo fue enviado por <strong>${context.empresaNombre || 'Kaptah'}</strong></p>
                  <p style="color:#bbb;font-size:11px;margin:8px 0 0;">Powered by Kaptah &bull; ${new Date().getFullYear()}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>`;
  }
  private generateDeliveryNoteHtml(context: any): string {
    const statusText = {
      'PENDING': 'Pendiente',
      'PROCESSING': 'En proceso',
      'TRANSIT': 'En transito',
      'DELIVERED': 'Entregado',
      'CANCELLED': 'Cancelado',
    };
    const statusColor = {
      'PENDING': '#ff9800',
      'PROCESSING': '#2196f3',
      'TRANSIT': '#9c27b0',
      'DELIVERED': '#4caf50',
      'CANCELLED': '#f44336',
    };
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0;padding:0;background-color:#f4f4f7;font-family:Arial,Helvetica,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f7;padding:40px 0;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
              <tr>
                <td style="background: linear-gradient(135deg, #2e7d32 0%, #66bb6a 100%);padding:30px 40px;text-align:center;">
                  <h1 style="color:#ffffff;margin:0;font-size:24px;">${context.empresaNombre || 'Kaptah'}</h1>
                </td>
              </tr>
              <tr>
                <td style="padding:40px;">
                  <h2 style="color:#333;margin:0 0 20px;">Nota de Entrega ${context.folio}</h2>
                  <p style="color:#555;font-size:15px;line-height:1.6;">
                    Adjunto encontrara su nota de entrega con los siguientes datos:
                  </p>
                  <table width="100%" cellpadding="8" cellspacing="0" style="margin:20px 0;border:1px solid #e8e8e8;border-radius:6px;">
                    <tr style="background-color:#f8f9fa;">
                      <td style="color:#666;font-size:14px;border-bottom:1px solid #e8e8e8;"><strong>Folio</strong></td>
                      <td style="color:#333;font-size:14px;border-bottom:1px solid #e8e8e8;">${context.folio}</td>
                    </tr>
                    <tr>
                      <td style="color:#666;font-size:14px;border-bottom:1px solid #e8e8e8;"><strong>Fecha de entrega</strong></td>
                      <td style="color:#333;font-size:14px;border-bottom:1px solid #e8e8e8;">${context.fecha}</td>
                    </tr>
                    <tr style="background-color:#f8f9fa;">
                      <td style="color:#666;font-size:14px;"><strong>Estado</strong></td>
                      <td style="font-size:14px;font-weight:bold;color:${statusColor[context.status] || '#333'};">${statusText[context.status] || context.status}</td>
                    </tr>
                  </table>
                  ${context.customMessage ? `<p style="color:#555;font-size:15px;line-height:1.6;background:#f8f9fa;padding:15px;border-radius:6px;border-left:4px solid #2e7d32;">${context.customMessage}</p>` : ''}
                  <p style="color:#555;font-size:14px;line-height:1.6;margin-top:30px;">
                    Si tiene alguna pregunta, no dude en contactarnos.
                  </p>
                </td>
              </tr>
              <tr>
                <td style="background-color:#f8f9fa;padding:20px 40px;text-align:center;border-top:1px solid #e8e8e8;">
                  <p style="color:#999;font-size:12px;margin:0;">Este correo fue enviado por <strong>${context.empresaNombre || 'Kaptah'}</strong></p>
                  <p style="color:#bbb;font-size:11px;margin:8px 0 0;">Powered by Kaptah &bull; ${new Date().getFullYear()}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>`;
  }

  private generateGenericHtml(context: any): string {
    return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin:0;padding:0;background-color:#f4f4f7;font-family:Arial,Helvetica,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f7;padding:40px 0;">
        <tr><td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="background-color:#fff;border-radius:8px;overflow:hidden;">
            <tr><td style="background:linear-gradient(135deg,#8e24aa,#667eea);padding:30px 40px;text-align:center;">
              <h1 style="color:#fff;margin:0;">Kaptah</h1>
            </td></tr>
            <tr><td style="padding:40px;">
              <p style="color:#555;font-size:15px;">${context.message || context.customMessage || 'Se adjunta el documento solicitado.'}</p>
            </td></tr>
            <tr><td style="background-color:#f8f9fa;padding:20px 40px;text-align:center;">
              <p style="color:#bbb;font-size:11px;margin:0;">Powered by Kaptah &bull; ${new Date().getFullYear()}</p>
            </td></tr>
          </table>
        </td></tr>
      </table>
    </body></html>`;
  }

  // ========== PROCESSORS ALL==========

  @Process({
    name: 'enviar-email',
    concurrency: 10,
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
      relatedEntityId,
    } = job.data;

    this.logger.log(`Enviando email: ${subject} a ${to}`);

    try {
      const processedAttachments = this.processAttachments(attachments);
      const html = this.generateEmailHtml(template, context);
      const recipient = Array.isArray(to) ? to[0] : to;

      const result = await this.resendService.send({
        to: recipient,
        subject,
        html,
        attachments: processedAttachments,
      });

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
        sentAt: new Date(),
      });

      await this.notificationQueue.add(
        'email-enviado',
        {
          userId,
          empresaId,
          entityType: relatedEntityType,
          entityId: relatedEntityId,
          emailTo: to,
        },
        { priority: 10 },
      );

      return {
        success: true,
        messageId: result.messageId,
        to,
      };
    } catch (error) {
      this.logger.error(
        `Error enviando email: ${error.message}`,
        error.stack,
      );

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
        failedAt: new Date(),
      });

      throw error;
    }
  }

  // Enviar nota de venta
  @Process({ name: 'enviar-nota-venta', concurrency: 5 })
  async sendSaleNote(job: Job): Promise<any> {
    const { notaId, clienteEmail, folio, customerName, total, saleDate, empresaNombre, customMessage, pdfBase64 } = job.data;

    this.logger.log(
      `📧 Procesando envio de nota de venta ${folio || notaId} a ${clienteEmail}`,
    );

    try {
      const fecha = saleDate
        ? new Date(saleDate).toLocaleDateString('es-MX')
        : new Date().toLocaleDateString('es-MX');

      const html = this.generateSaleNoteHtml({
        folio: folio || 'S/N',
        fecha,
        cliente: customerName || 'Cliente',
        total: total || 0,
        empresaNombre: empresaNombre || 'Kaptah',
        customMessage,
      });

      // Preparar attachments si hay PDF
      const attachments = [];
      if (pdfBase64) {
        attachments.push({
          filename: `Nota-de-Venta-${folio || notaId}.pdf`,
          content: Buffer.from(pdfBase64, 'base64'),
          contentType: 'application/pdf',
        });
        this.logger.log(`📎 PDF adjunto incluido para nota ${folio}`);
      }

      const result = await this.resendService.send({
        to: clienteEmail,
        subject: `Nota de Venta #${folio || notaId} - ${empresaNombre || 'Kaptah'}`,
        html,
        attachments: attachments.length > 0 ? attachments : undefined,
      });

      this.logger.log(
        `✅ Nota de venta ${folio} enviada exitosamente: ${result.messageId}`,
      );

      return {
        success: true,
        messageId: result.messageId,
        to: clienteEmail,
      };
    } catch (error) {
      this.logger.error(
        `❌ Error enviando nota de venta ${folio}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
  // Enviar cotización
  @Process({ name: 'enviar-cotizacion', concurrency: 5 })
  async sendCotizacion(job: Job): Promise<any> {
    const { cotizacionId, clienteEmail, folio, customerName, total, subtotal, impuestos, fechaValidez, fechaCreacion, moneda, empresaNombre, customMessage, pdfBase64 } = job.data;

    this.logger.log(
      `📧 Procesando envio de cotizacion ${folio || cotizacionId} a ${clienteEmail}`,
    );

    try {
      const fecha = fechaCreacion
        ? new Date(fechaCreacion).toLocaleDateString('es-MX')
        : new Date().toLocaleDateString('es-MX');

      const validez = fechaValidez
        ? new Date(fechaValidez).toLocaleDateString('es-MX')
        : 'No especificada';

      const html = this.generateCotizacionHtml({
        folio: folio || 'S/N',
        fecha,
        fechaValidez: validez,
        cliente: customerName || 'Cliente',
        subtotal: subtotal || 0,
        impuestos: impuestos || 0,
        total: total || 0,
        moneda: moneda || 'MXN',
        empresaNombre: empresaNombre || 'Kaptah',
        customMessage,
      });

      const attachments = [];
      if (pdfBase64) {
        attachments.push({
          filename: `Cotizacion-${folio || cotizacionId}.pdf`,
          content: Buffer.from(pdfBase64, 'base64'),
          contentType: 'application/pdf',
        });
        this.logger.log(`📎 PDF adjunto incluido para cotizacion ${folio}`);
      }

      const result = await this.resendService.send({
        to: clienteEmail,
        subject: `Cotizacion ${folio || cotizacionId} - ${empresaNombre || 'Kaptah'}`,
        html,
        attachments: attachments.length > 0 ? attachments : undefined,
      });

      this.logger.log(
        `✅ Cotizacion ${folio} enviada exitosamente: ${result.messageId}`,
      );

      return {
        success: true,
        messageId: result.messageId,
        to: clienteEmail,
      };
    } catch (error) {
      this.logger.error(
        `❌ Error enviando cotizacion ${folio}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
  // Enviar nota de entrega
  @Process({ name: 'enviar-nota-entrega', concurrency: 5 })
  async sendDeliveryNote(job: Job): Promise<any> {
    const { deliveryNoteId, clienteEmail, folio, salesOrderId, deliveryDate, status, empresaNombre, customMessage, pdfBase64 } = job.data;

    this.logger.log(
      `📧 Procesando envio de nota de entrega ${folio || deliveryNoteId} a ${clienteEmail}`,
    );

    try {
      const fecha = deliveryDate
        ? new Date(deliveryDate).toLocaleDateString('es-MX')
        : new Date().toLocaleDateString('es-MX');

      const html = this.generateDeliveryNoteHtml({
        folio: folio || 'S/N',
        fecha,
        salesOrderId: salesOrderId || '',
        status: status || 'PENDING',
        empresaNombre: empresaNombre || 'Kaptah',
        customMessage,
      });

      const attachments = [];
      if (pdfBase64) {
        attachments.push({
          filename: `Nota-de-Entrega-${folio || deliveryNoteId}.pdf`,
          content: Buffer.from(pdfBase64, 'base64'),
          contentType: 'application/pdf',
        });
        this.logger.log(`📎 PDF adjunto incluido para nota de entrega ${folio}`);
      }

      const result = await this.resendService.send({
        to: clienteEmail,
        subject: `Nota de Entrega ${folio || deliveryNoteId} - ${empresaNombre || 'Kaptah'}`,
        html,
        attachments: attachments.length > 0 ? attachments : undefined,
      });

      this.logger.log(
        `✅ Nota de entrega ${folio} enviada exitosamente: ${result.messageId}`,
      );

      return {
        success: true,
        messageId: result.messageId,
        to: clienteEmail,
      };
    } catch (error) {
      this.logger.error(
        `❌ Error enviando nota de entrega ${folio}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  // Enviar CFDI timbrado
  @Process({ name: 'enviar-cfdi', concurrency: 5 })
async sendCFDI(job: Job): Promise<any> {
  const { 
    cfdiId, clienteEmail, serie, folio, uuid, total, 
    emisorNombre, receptorNombre, fecha, customMessage,
    pdfBase64, xmlBase64 
  } = job.data;

  this.logger.log(`📧 Procesando envío de CFDI ${serie}-${folio} (${uuid}) a ${clienteEmail}`);

  try {
    const fechaFormateada = fecha
      ? new Date(fecha).toLocaleDateString('es-MX')
      : new Date().toLocaleDateString('es-MX');

    const html = this.generateCFDIHtml({
      serie: serie || '',
      folio: folio || '',
      uuid: uuid || cfdiId,
      fecha: fechaFormateada,
      cliente: receptorNombre || 'Cliente',
      total: total || 0,
      emisorNombre: emisorNombre || 'Kaptah',
      customMessage,
    });

    // Preparar adjuntos: PDF + XML
    const attachments = [];

    if (pdfBase64) {
      attachments.push({
        filename: `CFDI_${serie}${folio}_${uuid || cfdiId}.pdf`,
        content: Buffer.from(pdfBase64, 'base64'),
        contentType: 'application/pdf',
      });
      this.logger.log('📎 PDF adjunto incluido');
    }

    if (xmlBase64) {
      attachments.push({
        filename: `CFDI_${serie}${folio}_${uuid || cfdiId}.xml`,
        content: Buffer.from(xmlBase64, 'base64'),
        contentType: 'application/xml',
      });
      this.logger.log('📎 XML adjunto incluido');
    }

    const result = await this.resendService.send({
      to: clienteEmail,
      subject: `Factura Electrónica ${serie}-${folio} - ${emisorNombre || 'Kaptah'}`,
      html,
      attachments: attachments.length > 0 ? attachments : undefined,
    });

    this.logger.log(`✅ CFDI ${serie}-${folio} enviado exitosamente: ${result.messageId}`);

    return {
      success: true,
      messageId: result.messageId,
      to: clienteEmail,
    };
  } catch (error) {
    this.logger.error(`❌ Error enviando CFDI ${cfdiId}: ${error.message}`, error.stack);
    throw error;
  }
}

  // Enviar resumen de batch
  @Process({ name: 'enviar-resumen-batch', concurrency: 2 })
  async sendBatchSummary(job: Job): Promise<any> {
    const { userId, batchId, stats } = job.data;

    try {
      const user = await this.getUserData(userId);

      const html = this.generateBatchSummaryHtml({
        userName: user.nombre,
        batchId,
        total: stats.total,
        exitosos: stats.exitosos,
        fallidos: stats.fallidos,
      });

      const result = await this.resendService.send({
        to: user.email,
        subject: `Procesamiento completado - Batch ${batchId}`,
        html,
      });

      return { success: true, messageId: result.messageId };
    } catch (error) {
      this.logger.error(`Error enviando resumen batch: ${error.message}`);
      throw error;
    }
  }

  // Recordatorio de pago
  @Process({ name: 'recordatorio-pago', concurrency: 10 })
  async sendPaymentReminder(job: Job): Promise<any> {
    const { cxcId, clienteEmail, diasVencido } = job.data;

    try {
      const cxc = await this.getCxCData(cxcId);

      const html = this.generatePaymentReminderHtml({
        folio: cxc.folio,
        fechaVencimiento: cxc.fechaVencimiento,
        diasVencido,
        monto: cxc.saldo,
        cliente: cxc.clienteNombre,
        empresaNombre: cxc.empresaNombre,
      });

      const result = await this.resendService.send({
        to: clienteEmail,
        subject: `Recordatorio de Pago - Factura ${cxc.folio}`,
        html,
      });

      return { success: true, messageId: result.messageId };
    } catch (error) {
      this.logger.error(`Error enviando recordatorio: ${error.message}`);
      throw error;
    }
  }

  // Enviar batch de emails
  @Process({
    name: 'enviar-email-batch',
    concurrency: 2,
  })
  async sendBatchEmails(job: Job<{ emails: EmailJob[] }>): Promise<any> {
    const { emails } = job.data;

    this.logger.log(`Enviando batch de ${emails.length} emails`);

    const results = {
      total: emails.length,
      exitosos: 0,
      fallidos: 0,
      detalles: [] as any[],
    };

    const chunks = this.chunkArray(emails, 50);

    for (const chunk of chunks) {
      const promises = chunk.map((emailData: EmailJob) => {
        const html = this.generateEmailHtml(
          emailData.template,
          emailData.context,
        );
        const recipient = Array.isArray(emailData.to)
          ? emailData.to[0]
          : emailData.to;

        return this.resendService
          .send({
            to: recipient,
            subject: emailData.subject,
            html,
            attachments: this.processAttachments(emailData.attachments),
          })
          .then((result) => {
            results.exitosos++;
            return { success: true, to: emailData.to };
          })
          .catch((error: Error) => {
            results.fallidos++;
            return {
              success: false,
              to: emailData.to,
              error: error.message,
            };
          });
      });

      const chunkResults = await Promise.allSettled(promises);
      results.detalles.push(...chunkResults);

      await this.sleep(1000);
    }

    return results;
  }
// Enviar documento genérico (usado por EmailService via HTTP)
  @Process({ name: 'send-document', concurrency: 5 })
  async handleSendDocument(job: Job): Promise<any> {
    const { emailLogId, recipient, documentType, documentData, attachments, customMessage, recipientName } = job.data;

    this.logger.log(`📧 Procesando send-document tipo ${documentType} a ${recipient}`);

    try {
      // Mapear documentType a template
      const templateMap = {
        'invoice': 'cfdi-timbrado',
        'quotation': 'cotizacion',
        'delivery_note': 'nota-entrega',
        'payment_reminder': 'recordatorio-pago',
        'sale_order': 'nota-venta',
        'purchase_order': 'nota-venta',
      };

      const template = templateMap[documentType] || documentType;

      // Mapear campos según el tipo de documento
      let templateContext: any = {
        ...documentData,
        cliente: recipientName || documentData.clientName || documentData.customerName || 'Cliente',
        customMessage,
        empresaNombre: documentData.companyName || 'Kaptah',
        emisorNombre: documentData.companyName || 'Kaptah',
      };

      // Mapeo específico para recordatorio de pago
      if (documentType === 'payment_reminder') {
        const dueDate = documentData.dueDate ? new Date(documentData.dueDate) : new Date();
        const today = new Date();
        const diffTime = today.getTime() - dueDate.getTime();
        const diasVencido = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));

        templateContext = {
          ...templateContext,
          folio: documentData.invoiceNumber || documentData.folio || 'S/N',
          fechaVencimiento: dueDate.toLocaleDateString('es-MX'),
          diasVencido: diasVencido,
          monto: documentData.dueAmount || documentData.totalAmount || 0,
          cliente: recipientName || documentData.customerName || 'Cliente',
          empresaNombre: documentData.companyName || 'Kaptah',
        };
      }

      const html = this.generateEmailHtml(template, templateContext);

      const processedAttachments = [];
      if (attachments && attachments.length > 0) {
        for (const att of attachments) {
          processedAttachments.push({
            filename: att.filename,
            content: Buffer.from(att.content, 'base64'),
            contentType: att.contentType,
          });
        }
      }

      const subjects = {
        invoice: `Factura ${documentData.folio}`,
        quotation: `Cotizacion ${documentData.folio}`,
        delivery_note: `Remision ${documentData.folio}`,
        payment_reminder: `Recordatorio de pago - Factura ${documentData.folio}`,
        sale_order: `Orden de Venta ${documentData.folio}`,
      };

      const subject = subjects[documentType] || 'Documento';

      const result = await this.resendService.send({
        to: recipient,
        subject,
        html,
        attachments: processedAttachments.length > 0 ? processedAttachments : undefined,
      });

      this.logger.log(`✅ Documento ${documentType} enviado: ${result.messageId}`);

      return {
        success: true,
        messageId: result.messageId,
        to: recipient,
      };
    } catch (error) {
      this.logger.error(`❌ Error enviando documento ${documentType}: ${error.message}`, error.stack);
      throw error;
    }
  }

  // ========== METODOS AUXILIARES ==========

  private processAttachments(
    attachments: any[],
  ): Array<{ filename: string; content: string | Buffer; contentType: string }> {
    if (!attachments || attachments.length === 0) return [];

    return attachments
      .filter((att) => att && (att.content || att.path))
      .map((att) => ({
        filename: att.filename,
        content: att.content || '',
        contentType: att.contentType || 'application/octet-stream',
      }));
  }

  private async saveEmailLog(data: any): Promise<void> {
    this.logger.log(`Email log: ${data.status} - ${data.to}`);
    // TODO: Implementar guardado en DB via EmailLogService
  }

  private async getSaleNoteData(notaId: string): Promise<any> {
    // TODO: Obtener datos reales desde sales-api via HTTP o DB directa
    // Por ahora retorna mock - NECESITA IMPLEMENTACION REAL
    this.logger.warn(
      `getSaleNoteData: usando datos mock para nota ${notaId} - implementar llamada real`,
    );
    return {
      folio: 'NV-001',
      fecha: new Date().toLocaleDateString('es-MX'),
      clienteNombre: 'Cliente',
      total: 0,
      empresaNombre: 'Empresa',
      userId: 'unknown',
      empresaId: 'unknown',
    };
  }

  private async getCFDIData(cfdiId: string): Promise<any> {
    // TODO: Obtener datos reales
    this.logger.warn(
      `getCFDIData: usando datos mock para CFDI ${cfdiId} - implementar llamada real`,
    );
    return {
      serie: 'A',
      folio: '000',
      uuid: cfdiId,
      fecha: new Date().toLocaleDateString('es-MX'),
      receptorNombre: 'Cliente',
      total: 0,
      emisorNombre: 'Empresa',
      userId: 'unknown',
      empresaId: 'unknown',
    };
  }

  private async getCxCData(cxcId: string): Promise<any> {
    this.logger.warn(`getCxCData: usando datos mock para CxC ${cxcId}`);
    return {
      folio: 'A-000',
      fechaVencimiento: new Date().toLocaleDateString('es-MX'),
      saldo: 0,
      clienteNombre: 'Cliente',
      empresaNombre: 'Empresa',
      userId: 'unknown',
      empresaId: 'unknown',
      cfdiId: cxcId,
    };
  }

  private async getUserData(userId: string): Promise<any> {
    this.logger.warn(`getUserData: usando datos mock para user ${userId}`);
    return {
      email: 'user@example.com',
      nombre: 'Usuario',
      empresaId: 'unknown',
    };
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  @OnQueueCompleted()
  onCompleted(job: Job, result: any) {
    this.logger.log(`✅ Email completado: Job ${job.id} - ${result?.to || 'N/A'}`);
  }

  @OnQueueFailed()
  onFailed(job: Job, error: Error) {
    this.logger.error(`❌ Email fallo: Job ${job.id} - ${error.message}`);
  }
}
