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
        service: 'inventory-api',
      },
      this.jwtSecret,
      { expiresIn: '1h' }
    );
  }

  /**
   * Enviar orden de compra por email a proveedor
   */
  async sendPurchaseOrder(data: {
    userId: string;
    organizationId: string;
    recipientEmail: string;
    purchaseOrderId: number;
    orderNumber: string;
    supplierName: string;
    orderDate: string;
    expectedDate: string;
    total: number;
    currency: string;
    items: Array<{
      productName: string;
      quantity: number;
      unitPrice: number;
      subtotal: number;
    }>;
    notes?: string;
    customMessage?: string;
  }): Promise<{ jobId: string; logId: string }> {
    try {
      this.logger.log(`Enviando orden de compra ${data.orderNumber} a ${data.recipientEmail}`);

      const token = this.generateToken(data.userId, data.organizationId);

      const payload = {
        userId: data.userId,
        organizationId: data.organizationId,
        recipient: data.recipientEmail,
        documentType: 'purchase_order',
        documentId: data.purchaseOrderId.toString(),
        recipientName: data.supplierName,
        customMessage: data.customMessage || `Orden de compra ${data.orderNumber}`,
        documentData: {
          orderNumber: data.orderNumber,
          supplierName: data.supplierName,
          orderDate: data.orderDate,
          expectedDate: data.expectedDate,
          total: data.total,
          currency: data.currency,
          items: data.items,
          notes: data.notes,
        },
        metadata: {
          purchaseOrderId: data.purchaseOrderId,
          orderNumber: data.orderNumber,
        },
      };

      const response = await this.axiosInstance.post('/email/send-document', payload, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      this.logger.log(`Orden de compra enviada: JobId=${response.data.jobId}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Error enviando orden de compra: ${error.message}`, error.stack);
      
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