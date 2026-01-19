import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { SendInvoiceEmailDto } from './dto/send-invoice-email.dto';
import { SendQuotationEmailDto } from './dto/send-quotation-email.dto';

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
        service: 'sales-api',
      },
      this.jwtSecret,
      { expiresIn: '1h' }
    );
  }

  /**
   * Enviar factura por email
   */
  async sendInvoiceEmail(dto: SendInvoiceEmailDto): Promise<{ jobId: string; logId: string }> {
    try {
      this.logger.log(`Enviando factura ${dto.folio} a ${dto.recipientEmail}`);

      const token = this.generateToken(dto.userId, dto.organizationId);

      const payload = {
        userId: dto.userId,
        organizationId: dto.organizationId,
        recipient: dto.recipientEmail,
        documentType: 'invoice',
        documentId: dto.cfdiId,
        recipientName: dto.clientName,
        customMessage: dto.customMessage,
        documentData: {
          folio: dto.folio,
          date: dto.date,
          total: dto.total,
          currency: dto.currency,
          subtotal: dto.subtotal,
          tax: dto.tax,
          taxRate: dto.taxRate || 16,
          clientName: dto.clientName,
          clientRFC: dto.clientRFC,
          items: dto.items,
          notes: dto.notes,
          companyLogo: dto.companyLogo || 'https://via.placeholder.com/120x40/7F3FF0/FFFFFF?text=KAPTAH', // <-- AGREGAR
        },
        attachments: dto.pdfBase64 ? [
          {
            filename: `Factura-${dto.folio}.pdf`,
            content: dto.pdfBase64,
            contentType: 'application/pdf',
          },
        ] : [],
        metadata: {
          cfdiId: dto.cfdiId,
          uuid: dto.uuid,
          serie: dto.serie,
          invoiceType: 'cfdi',
        },
      };

      const response = await this.axiosInstance.post('/email/send-document', payload, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      this.logger.log(`Email de factura enviado: JobId=${response.data.jobId}, LogId=${response.data.logId}`);

      return response.data;
    } catch (error) {
      this.logger.error(`Error enviando email de factura: ${error.message}`, error.stack);
      
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
   * Enviar cotización por email
   */
  async sendQuotationEmail(dto: SendQuotationEmailDto): Promise<{ jobId: string; logId: string }> {
    try {
      this.logger.log(`Enviando cotización ${dto.folio} a ${dto.recipientEmail}`);

      const token = this.generateToken(dto.userId, dto.organizationId);

      const payload = {
        userId: dto.userId,
        organizationId: dto.organizationId,
        recipient: dto.recipientEmail,
        documentType: 'quotation',
        documentId: dto.quotationId,
        recipientName: dto.clientName,
        customMessage: dto.customMessage,
        documentData: {
          folio: dto.folio,
          date: dto.date,
          total: dto.total,
          currency: dto.currency,
          subtotal: dto.subtotal,
          tax: dto.tax,
          taxRate: dto.taxRate || 16,
          clientName: dto.clientName,
          contactEmail: dto.recipientEmail,
          validUntil: dto.validUntil,
          items: dto.items,
          terms: dto.terms,
        },
        attachments: dto.pdfBase64 ? [
          {
            filename: `Cotizacion-${dto.folio}.pdf`,
            content: dto.pdfBase64,
            contentType: 'application/pdf',
          },
        ] : [],
        metadata: {
          quotationId: dto.quotationId,
        },
      };

      const response = await this.axiosInstance.post('/email/send-document', payload, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      this.logger.log(`Email de cotización enviado: JobId=${response.data.jobId}`);

      return response.data;
    } catch (error) {
      this.logger.error(`Error enviando email de cotización: ${error.message}`);
      throw new HttpException(
        'Error al enviar cotización por email',
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

  /**
   * Obtener historial de emails
   */
  async getEmailHistory(userId: string, organizationId: string, filters?: any) {
    try {
      const token = this.generateToken(userId, organizationId);

      const response = await this.axiosInstance.get('/email/history', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params: {
          userId,
          organizationId,
          ...filters,
        },
      });

      return response.data;
    } catch (error) {
      this.logger.error(`Error obteniendo historial de emails: ${error.message}`);
      throw new HttpException(
        'Error al obtener historial de emails',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
  /**
 * Enviar orden de venta por email
 */
async sendSaleOrder(data: {
  userId: string;
  organizationId: string;
  recipientEmail: string;
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerAddress: string;
  customerRfc: string;
  orderDate: string;
  deliveryDate: string;
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }>;
  status: string;
  notes?: string;
  customMessage?: string;
}): Promise<{ jobId: string; logId: string }> {
  try {
    this.logger.log(`Enviando orden de venta ${data.orderNumber} a ${data.recipientEmail}`);

    const payload = {
      userId: data.userId,
      organizationId: data.organizationId,
      recipient: data.recipientEmail,
      documentType: 'sale_order',
      documentId: data.orderId,
      recipientName: data.customerName,
      customMessage: data.customMessage,
      documentData: {
        orderNumber: data.orderNumber,
        customerName: data.customerName,
        customerAddress: data.customerAddress,
        customerRfc: data.customerRfc,
        orderDate: data.orderDate,
        deliveryDate: data.deliveryDate,
        subtotal: data.subtotal,
        tax: data.tax,
        total: data.total,
        currency: data.currency,
        items: data.items,
        status: data.status,
        notes: data.notes,
      },
      metadata: {
        orderId: data.orderId,
        orderType: 'sale_order',
      },
    };

    const response = await this.axiosInstance.post('/email/send-document', payload, {
      headers: {
        Authorization: `Bearer ${this.generateToken(data.userId, data.organizationId)}`,
      },
    });

    this.logger.log(`Orden de venta enviada: JobId=${response.data.jobId}`);
    return response.data;
  } catch (error) {
    this.logger.error(`Error enviando orden de venta: ${error.message}`, error.stack);
    
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
 * Enviar nota de entrega por email
 */
async sendDeliveryNote(data: {
  userId: string;
  organizationId: string;
  recipientEmail: string;
  deliveryNoteId: string;
  deliveryNoteNumber: string;
  customerName: string;
  customerAddress: string;
  customerRfc: string;
  deliveryDate: string;
  status: string;
  items: Array<{
    description: string;
    quantity: number;
  }>;
  salesOrderId: string;
  sucursal?: {
    nombre: string;
    direccion: string;
    telefono: string;
    email: string;
  };
  notes?: string;
  customMessage?: string;
}): Promise<{ jobId: string; logId: string }> {
  try {
    this.logger.log(`Enviando nota de entrega ${data.deliveryNoteNumber} a ${data.recipientEmail}`);

    const payload = {
      userId: data.userId,
      organizationId: data.organizationId,
      recipient: data.recipientEmail,
      documentType: 'delivery_note',
      documentId: data.deliveryNoteId,
      recipientName: data.customerName,
      customMessage: data.customMessage,
      documentData: {
        deliveryNoteNumber: data.deliveryNoteNumber,
        customerName: data.customerName,
        customerAddress: data.customerAddress,
        customerRfc: data.customerRfc,
        deliveryDate: data.deliveryDate,
        status: data.status,
        items: data.items,
        salesOrderId: data.salesOrderId,
        sucursal: data.sucursal,
        notes: data.notes,
      },
      metadata: {
        deliveryNoteId: data.deliveryNoteId,
        salesOrderId: data.salesOrderId,
      },
    };

    const response = await this.axiosInstance.post('/email/send-document', payload, {
      headers: {
        Authorization: `Bearer ${this.generateToken(data.userId, data.organizationId)}`,
      },
    });

    this.logger.log(`Nota de entrega enviada: JobId=${response.data.jobId}`);
    return response.data;
  } catch (error) {
    this.logger.error(`Error enviando nota de entrega: ${error.message}`, error.stack);
    
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
}