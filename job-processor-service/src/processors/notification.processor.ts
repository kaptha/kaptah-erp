import { Processor, Process, OnQueueCompleted, OnQueueFailed } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { QueueName } from '../config/queue.config';

interface NotificationJob {
  userId: string;
  empresaId: string;
  type: 'cfdi-timbrado' | 'batch-completado' | 'email-enviado' | 'cfdi-cancelado' | 
        'pago-recibido' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  data?: any;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  channels?: ('websocket' | 'push' | 'email' | 'sms')[];
  link?: string;
}

@Processor(QueueName.NOTIFICATION)
export class NotificationProcessor {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(
    // private readonly notificationService: NotificationService,
    // private readonly websocketGateway: WebsocketGateway,
    // private readonly pushService: PushNotificationService,
  ) {}

  @Process({ 
    name: 'enviar-notificacion', 
    concurrency: 20 // Notificaciones son ligeras
  })
  async sendNotification(job: Job<NotificationJob>): Promise<any> {
    const { 
      userId, 
      empresaId, 
      type, 
      title, 
      message, 
      data, 
      priority = 'medium',
      channels = ['websocket'],
      link 
    } = job.data;

    this.logger.log(`Enviando notificación: ${type} a usuario ${userId}`);

    try {
      // 1. Guardar notificación en DB
      const notification = await this.saveNotification({
        userId,
        empresaId,
        type,
        title,
        message,
        data,
        priority,
        link,
        isRead: false,
        createdAt: new Date()
      });

      // 2. Enviar por canales especificados
      const results = {
        websocket: false,
        push: false,
        email: false,
        sms: false
      };

      if (channels.includes('websocket')) {
        results.websocket = await this.sendWebSocketNotification(userId, notification);
      }

      if (channels.includes('push')) {
        results.push = await this.sendPushNotification(userId, notification);
      }

      if (channels.includes('email')) {
        // Ya se maneja en EmailProcessor, pero podría ser un resumen
        results.email = true;
      }

      if (channels.includes('sms')) {
        results.sms = await this.sendSMSNotification(userId, notification);
      }

      return {
        success: true,
        notificationId: notification.id,
        channels: results
      };

    } catch (error) {
      this.logger.error(`Error enviando notificación: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Process({ name: 'cfdi-timbrado', concurrency: 10 })
  async notifyCFDITimbrado(job: Job): Promise<any> {
    const { userId, empresaId, cfdiId } = job.data;

    const cfdi = await this.getCFDIBasicInfo(cfdiId);

    return await this.sendNotification({
      data: {
        userId,
        empresaId,
        type: 'cfdi-timbrado',
        title: '✅ CFDI Timbrado',
        message: `Factura ${cfdi.serie}-${cfdi.folio} timbrada exitosamente`,
        data: { cfdiId, uuid: cfdi.uuid },
        priority: 'high',
        channels: ['websocket', 'push'],
        link: `/cfdis/${cfdiId}`
      }
    } as Job<NotificationJob>);
  }

  @Process({ name: 'batch-completado', concurrency: 5 })
  async notifyBatchCompleted(job: Job): Promise<any> {
    const { userId, empresaId, batchId, stats } = job.data;

    const successRate = ((stats.exitosos / stats.total) * 100).toFixed(0);

    return await this.sendNotification({
      data: {
        userId,
        empresaId,
        type: 'batch-completado',
        title: '📦 Carga Masiva Completada',
        message: `${stats.exitosos}/${stats.total} XMLs procesados (${successRate}% éxito)`,
        data: { batchId, stats },
        priority: 'high',
        channels: ['websocket', 'push'],
        link: `/cfdis/batch/${batchId}`
      }
    } as Job<NotificationJob>);
  }

  @Process({ name: 'email-enviado', concurrency: 20 })
  async notifyEmailSent(job: Job): Promise<any> {
    const { userId, empresaId, entityType, entityId, emailTo } = job.data;

    return await this.sendNotification({
      data: {
        userId,
        empresaId,
        type: 'email-enviado',
        title: '📧 Email Enviado',
        message: `Documento enviado a ${emailTo}`,
        data: { entityType, entityId },
        priority: 'low',
        channels: ['websocket']
      }
    } as Job<NotificationJob>);
  }

  @Process({ name: 'cfdi-cancelado', concurrency: 5 })
  async notifyCFDICanceled(job: Job): Promise<any> {
    const { userId, empresaId, cfdiId, uuid } = job.data;

    return await this.sendNotification({
      data: {
        userId,
        empresaId,
        type: 'cfdi-cancelado',
        title: '❌ CFDI Cancelado',
        message: `CFDI ${uuid.substring(0, 8)}... cancelado`,
        data: { cfdiId, uuid },
        priority: 'high',
        channels: ['websocket', 'push'],
        link: `/cfdis/${cfdiId}`
      }
    } as Job<NotificationJob>);
  }

  @Process({ name: 'pago-recibido', concurrency: 10 })
  async notifyPaymentReceived(job: Job): Promise<any> {
    const { userId, empresaId, pagoId, monto, clienteNombre } = job.data;

    return await this.sendNotification({
      data: {
        userId,
        empresaId,
        type: 'pago-recibido',
        title: '💰 Pago Recibido',
        message: `$${monto.toLocaleString('es-MX')} de ${clienteNombre}`,
        data: { pagoId, monto },
        priority: 'high',
        channels: ['websocket', 'push'],
        link: `/pagos/${pagoId}`
      }
    } as Job<NotificationJob>);
  }

  @Process({ name: 'error-proceso', concurrency: 10 })
  async notifyError(job: Job): Promise<any> {
    const { userId, empresaId, proceso, error } = job.data;

    return await this.sendNotification({
      data: {
        userId,
        empresaId,
        type: 'error',
        title: '⚠️ Error en Proceso',
        message: `Error en ${proceso}: ${error}`,
        data: { proceso, error },
        priority: 'urgent',
        channels: ['websocket', 'push']
      }
    } as Job<NotificationJob>);
  }

  @Process({ name: 'recordatorio-vencimiento', concurrency: 5 })
  async notifyDueReminder(job: Job): Promise<any> {
    const { userId, empresaId, facturas } = job.data;

    return await this.sendNotification({
      data: {
        userId,
        empresaId,
        type: 'warning',
        title: '⏰ Facturas por Vencer',
        message: `Tienes ${facturas.length} facturas por vencer esta semana`,
        data: { facturas },
        priority: 'medium',
        channels: ['websocket', 'push', 'email'],
        link: `/cxc/por-vencer`
      }
    } as Job<NotificationJob>);
  }

  // ========== MÉTODOS AUXILIARES ==========

  private async saveNotification(data: any): Promise<any> {
    // Guardar en DB
    return {
      id: `notif-${Date.now()}`,
      ...data
    };
  }

  private async sendWebSocketNotification(userId: string, notification: any): Promise<boolean> {
    try {
      // Enviar vía WebSocket Gateway
      // await this.websocketGateway.sendToUser(userId, 'notification', notification);
      this.logger.log(`WebSocket enviado a usuario ${userId}`);
      return true;
    } catch (error) {
      this.logger.error(`Error enviando WebSocket: ${error.message}`);
      return false;
    }
  }

  private async sendPushNotification(userId: string, notification: any): Promise<boolean> {
    try {
      // Obtener tokens FCM del usuario
      const tokens = await this.getUserPushTokens(userId);
      
      if (tokens.length === 0) return false;

      // Enviar push notification
      // await this.pushService.send({
      //   tokens,
      //   title: notification.title,
      //   body: notification.message,
      //   data: notification.data
      // });

      this.logger.log(`Push notification enviada a ${tokens.length} dispositivos`);
      return true;
    } catch (error) {
      this.logger.error(`Error enviando push: ${error.message}`);
      return false;
    }
  }

  private async sendSMSNotification(userId: string, notification: any): Promise<boolean> {
    try {
      const userPhone = await this.getUserPhone(userId);
      
      if (!userPhone) return false;

      // Enviar SMS (Twilio, etc.)
      // await this.smsService.send({
      //   to: userPhone,
      //   message: `${notification.title}: ${notification.message}`
      // });

      this.logger.log(`SMS enviado a ${userPhone}`);
      return true;
    } catch (error) {
      this.logger.error(`Error enviando SMS: ${error.message}`);
      return false;
    }
  }

  private async getCFDIBasicInfo(cfdiId: string): Promise<any> {
    return {
      serie: 'A',
      folio: '123',
      uuid: '12345678-1234-1234-1234-123456789012'
    };
  }

  private async getUserPushTokens(userId: string): Promise<string[]> {
    // Obtener tokens FCM del usuario desde DB
    return []; // Mock
  }

  private async getUserPhone(userId: string): Promise<string | null> {
    // Obtener teléfono del usuario
    return null; // Mock
  }

  @OnQueueCompleted()
  onCompleted(job: Job, result: any) {
    this.logger.log(`✓ Notificación enviada: Job ${job.id}`);
  }

  @OnQueueFailed()
  onFailed(job: Job, error: Error) {
    this.logger.error(`✗ Notificación falló: Job ${job.id} - ${error.message}`);
  }
}