import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class EmailClientService {
  private readonly logger = new Logger(EmailClientService.name);
  private readonly axiosInstance: any;
  private readonly emailServiceUrl: string;
  private readonly jwtSecret: string;

  constructor(private configService: ConfigService) {
    this.emailServiceUrl = this.configService.get<string>('EMAIL_SERVICE_URL') || 'http://localhost:3002/api/v1';
    this.jwtSecret = this.configService.get<string>('EMAIL_SERVICE_JWT_SECRET');

    this.axiosInstance = axios.create({
      baseURL: this.emailServiceUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.logger.log(`Email Client Service inicializado: ${this.emailServiceUrl}`);
  }

  /**
   * Genera un token JWT para autenticar con el email-service
   */
  private generateToken(userId: string, organizationId: string): string {
    const jwt = require('jsonwebtoken');
    
    return jwt.sign(
      {
        userId,
        organizationId,
        service: 'finance-api',
      },
      this.jwtSecret,
      { expiresIn: '1h' }
    );
  }

  /**
   * Enviar recordatorio de pago (Cuentas por Cobrar)
   */
  async sendPaymentReminder(data: {
    userId: string;
    organizationId: string;
    recipientEmail: string;
    accountId: string;
    customerName: string;
    invoiceNumber: string;
    totalAmount: number;
    dueAmount: number;
    dueDate: string;
    currency: string;
    customMessage?: string;
  }): Promise<{ jobId: string; logId: string }> {
    try {
      this.logger.log(`Enviando recordatorio de pago a ${data.recipientEmail}`);

      const token = this.generateToken(data.userId, data.organizationId);

      const payload = {
        userId: data.userId,
        organizationId: data.organizationId,
        recipient: data.recipientEmail,
        documentType: 'payment_reminder',
        documentId: data.accountId,
        recipientName: data.customerName,
        customMessage: data.customMessage || `Estimado cliente, le recordamos que tiene un pago pendiente.`,
        documentData: {
          invoiceNumber: data.invoiceNumber,
          dueDate: data.dueDate,
          totalAmount: data.totalAmount,
          dueAmount: data.dueAmount,
          currency: data.currency,
          customerName: data.customerName,
          gracePeriod: 5,
          lateFee: 0,
          paymentMethods: [
            'Transferencia bancaria',
            'Tarjeta de crédito',
            'Efectivo'
          ]
        },
        metadata: {
          accountId: data.accountId,
          reminderType: 'payment_due',
        },
      };

      const response = await this.axiosInstance.post('/email/send-document', payload, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      this.logger.log(`Recordatorio enviado: JobId=${response.data.jobId}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Error enviando recordatorio: ${error.message}`, error.stack);
      
      if (error.response) {
        throw new HttpException(
          `Error del servicio de email: ${error.response.data?.message || error.message}`,
          error.response.status || HttpStatus.INTERNAL_SERVER_ERROR
        );
      }
      
      throw new HttpException(
        'Error al conectar con el servicio de email',
        HttpStatus.SERVICE_UNAVAILABLE
      );
    }
  }

  /**
   * Enviar aviso de pago próximo (Cuentas por Pagar)
   */
  async sendPaymentNotice(data: {
    userId: string;
    organizationId: string;
    recipientEmail: string;
    accountId: string;
    providerName: string;
    invoiceNumber: string;
    totalAmount: number;
    dueDate: string;
    currency: string;
    customMessage?: string;
  }): Promise<{ jobId: string; logId: string }> {
    try {
      this.logger.log(`Enviando aviso de pago a ${data.recipientEmail}`);

      const token = this.generateToken(data.userId, data.organizationId);

      const payload = {
        userId: data.userId,
        organizationId: data.organizationId,
        recipient: data.recipientEmail,
        documentType: 'payment_reminder',
        documentId: data.accountId,
        recipientName: data.providerName,
        customMessage: data.customMessage || `Aviso: Próximo pago a vencer`,
        documentData: {
          invoiceNumber: data.invoiceNumber,
          dueDate: data.dueDate,
          totalAmount: data.totalAmount,
          dueAmount: data.totalAmount,
          currency: data.currency,
          customerName: data.providerName,
        },
        metadata: {
          accountId: data.accountId,
          noticeType: 'payment_upcoming',
        },
      };

      const response = await this.axiosInstance.post('/email/send-document', payload, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      this.logger.log(`Aviso enviado: JobId=${response.data.jobId}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Error enviando aviso: ${error.message}`);
      throw new HttpException(
        'Error al enviar aviso de pago',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Consultar estado de un email
   */
  async getEmailStatus(logId: string, userId: string, organizationId: string) {
    try {
      const token = this.generateToken(userId, organizationId);

      const response = await this.axiosInstance.get(`/email/status/${logId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return response.data;
    } catch (error) {
      this.logger.error(`Error consultando estado de email: ${error.message}`);
      throw new HttpException(
        'Error al consultar estado del email',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}