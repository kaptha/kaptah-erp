import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue, JobOptions } from 'bull';
import { QueueName } from './interfaces/queue-names';

@Injectable()
export class QueueClientService {
  private readonly logger = new Logger(QueueClientService.name);

  constructor(
    @InjectQueue(QueueName.EMAIL) private emailQueue: Queue,
    @InjectQueue(QueueName.PDF_GENERATION) private pdfQueue: Queue,
    @InjectQueue(QueueName.XML_PROCESSING) private xmlQueue: Queue,
    @InjectQueue(QueueName.CFDI_TIMBRADO) private timbradoQueue: Queue,
    @InjectQueue(QueueName.NOTIFICATION) private notificationQueue: Queue,
    @InjectQueue(QueueName.REPORT_GENERATION) private reportQueue: Queue,
    @InjectQueue(QueueName.INVENTORY_UPDATE) private inventoryQueue: Queue,
    @InjectQueue(QueueName.ACCOUNTING) private accountingQueue: Queue,
  ) {}

  // ========== EMAIL JOBS ==========

  async sendEmail(data: {
    to: string | string[];
    subject: string;
    template: string;
    context?: any;
    attachments?: any[];
    userId: string;
    empresaId: string;
    relatedEntityType: string;
    relatedEntityId: string;
  }, options?: JobOptions) {
    try {
      const job = await this.emailQueue.add('enviar-email', data, {
        priority: options?.priority || 5,
        ...options
      });
      
      this.logger.log(`Email job creado: ${job.id}`);
      return job;
    } catch (error) {
      this.logger.error(`Error creando email job: ${error.message}`);
      throw error;
    }
  }

  async sendSaleNoteEmail(notaId: string, clienteEmail: string) {
    return await this.emailQueue.add('enviar-nota-venta', {
      notaId,
      clienteEmail
    }, { priority: 3 });
  }

  async sendCFDIEmail(cfdiId: string, clienteEmail: string) {
    return await this.emailQueue.add('enviar-cfdi', {
      cfdiId,
      clienteEmail
    }, { priority: 2 });
  }

  async sendBatchSummaryEmail(userId: string, batchId: string, stats: any) {
    return await this.emailQueue.add('enviar-resumen-batch', {
      userId,
      batchId,
      stats
    }, { priority: 3 });
  }

  async sendPaymentReminder(cxcId: string, clienteEmail: string, diasVencido: number) {
    return await this.emailQueue.add('recordatorio-pago', {
      cxcId,
      clienteEmail,
      diasVencido
    }, { priority: 2 });
  }

  // ========== PDF JOBS ==========

  async generatePDF(data: {
    entityId: string;
    entityType: string;
    template: string;
    data?: any;
    userId: string;
    empresaId: string;
  }, options?: JobOptions) {
    const job = await this.pdfQueue.add('generar-pdf', data, {
      priority: options?.priority || 5,
      ...options
    });
    
    this.logger.log(`PDF job creado: ${job.id}`);
    return job;
  }

  async generateSaleNotePDF(notaId: string) {
    return await this.pdfQueue.add('generar-pdf-nota-venta', {
      notaId
    }, { priority: 3 });
  }

  async generateCFDIPDF(cfdiId: string, templateType: 'clasico' | 'modern' | 'minimalist' = 'clasico') {
    return await this.pdfQueue.add('generar-pdf-cfdi', {
      cfdiId,
      templateType
    }, { priority: 3 });
  }

  async generateReport(reportType: string, filters: any, userId: string, empresaId: string) {
    return await this.reportQueue.add('generar-reporte', {
      reportType,
      filters,
      userId,
      empresaId
    }, { priority: 10 }); // Baja prioridad
  }

  // ========== XML PROCESSING JOBS ==========

  async processXML(data: {
    xmlContent?: string;
    zipPath?: string;
    xmlFile?: string;
    userId: string;
    empresaId: string;
    batchId: string;
    clientTier: string;
  }) {
    const job = await this.xmlQueue.add('procesar-xml', data, {
      priority: 1, // Alta prioridad
      attempts: 1, // No reintentar
      timeout: 30000
    });
    
    this.logger.log(`XML job creado: ${job.id}`);
    return job;
  }

  async processBatchXMLs(xmlFiles: string[], zipPath: string, userId: string, empresaId: string, clientTier: string) {
    const batchId = `batch-${Date.now()}`;
    
    const jobs = xmlFiles.map((xmlFile, index) => ({
      name: 'procesar-xml',
      data: {
        zipPath,
        xmlFile,
        userId,
        empresaId,
        batchId,
        clientTier
      },
      opts: {
        priority: 1,
        attempts: 1,
        // Procesar en lotes pequeños para no saturar
        jobId: `${batchId}-${index}`
      }
    }));

    // Añadir todos los jobs en bulk (más eficiente)
    await this.xmlQueue.addBulk(jobs);
    
    this.logger.log(`Batch creado: ${batchId} con ${xmlFiles.length} XMLs`);
    
    return { batchId, total: xmlFiles.length };
  }

  // ========== CFDI TIMBRADO JOBS ==========

  async timbrarCFDI(data: {
    cfdiId: string;
    xmlSinTimbrar: string;
    userId: string;
    empresaId: string;
    certificadoId: string;
    csdPassword?: string;
  }) {
    const job = await this.timbradoQueue.add('timbrar-cfdi', data, {
      priority: 2,
      attempts: 5,
      backoff: {
        type: 'exponential',
        delay: 3000
      }
    });
    
    this.logger.log(`Timbrado job creado: ${job.id}`);
    return job;
  }

  async cancelarCFDI(data: {
    cfdiId: string;
    motivo: string;
    uuidSustitucion?: string;
    userId: string;
    empresaId: string;
    certificadoId: string;
  }) {
    return await this.timbradoQueue.add('cancelar-cfdi', data, {
      priority: 2,
      attempts: 3
    });
  }

  async validarCFDISAT(cfdiId: string, uuid: string) {
    return await this.timbradoQueue.add('validar-cfdi-sat', {
      cfdiId,
      uuid
    }, { priority: 5 });
  }

  // ========== NOTIFICATION JOBS ==========

  async sendNotification(data: {
    userId: string;
    empresaId: string;
    type: string;
    title: string;
    message: string;
    data?: any;
    priority?: string;
    channels?: string[];
    link?: string;
  }) {
    return await this.notificationQueue.add('enviar-notificacion', data, {
      priority: data.priority === 'urgent' ? 1 : data.priority === 'high' ? 2 : 5
    });
  }

  async notifyCFDITimbrado(cfdiId: string, userId: string, empresaId: string) {
    return await this.notificationQueue.add('cfdi-timbrado', {
      cfdiId,
      userId,
      empresaId
    }, { priority: 2 });
  }

  async notifyBatchCompleted(batchId: string, userId: string, empresaId: string, stats: any) {
    return await this.notificationQueue.add('batch-completado', {
      batchId,
      userId,
      empresaId,
      stats
    }, { priority: 2 });
  }

  // ========== INVENTORY JOBS ==========

  async deductStockForSale(data: {
    notaVentaId: string;
    items: Array<{ productoId: string; cantidad: number }>;
    almacenId: string;
    empresaId: string;
    userId: string;
  }) {
    return await this.inventoryQueue.add('deducir-stock-venta', data, {
      priority: 3
    });
  }

  async reserveStock(data: {
    ordenVentaId: string;
    items: Array<{ productoId: string; cantidad: number }>;
    almacenId: string;
    empresaId: string;
    userId: string;
  }) {
    return await this.inventoryQueue.add('reservar-stock', data, {
      priority: 3
    });
  }

  async releaseStock(data: {
    ordenVentaId: string;
    items: Array<{ productoId: string; cantidad: number }>;
    almacenId: string;
    empresaId: string;
    userId: string;
  }) {
    return await this.inventoryQueue.add('liberar-stock', data, {
      priority: 3
    });
  }

  // ========== ACCOUNTING JOBS ==========

  async createCxC(data: {
    cfdiId: string;
    userId: string;
    empresaId: string;
    monto: number;
    clienteId?: string;
    diasCredito?: number;
  }) {
    return await this.accountingQueue.add('crear-cxc', data, {
      priority: 2
    });
  }

  async createCxP(data: {
    cfdiId: string;
    userId: string;
    empresaId: string;
    monto: number;
    proveedorId?: string;
    diasCredito?: number;
  }) {
    return await this.accountingQueue.add('crear-cxp', data, {
      priority: 2
    });
  }

  async applyPayment(data: {
    cfdiId: string;
    pagoId: string;
    monto: number;
    facturasPagadas: any[];
    userId: string;
    empresaId: string;
  }) {
    return await this.accountingQueue.add('aplicar-pago', data, {
      priority: 2
    });
  }

  // ========== UTILIDADES ==========

  async getJobStatus(queueName: QueueName, jobId: string) {
    const queue = this.getQueue(queueName);
    const job = await queue.getJob(jobId);
    
    if (!job) return null;

    return {
      id: job.id,
      name: job.name,
      data: job.data,
      progress: await job.progress(),
      state: await job.getState(),
      attemptsMade: job.attemptsMade,
      failedReason: job.failedReason,
      finishedOn: job.finishedOn,
      processedOn: job.processedOn
    };
  }

  async getQueueStats(queueName: QueueName) {
    const queue = this.getQueue(queueName);
    
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount()
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + completed + failed + delayed
    };
  }

  private getQueue(queueName: QueueName): Queue {
    switch (queueName) {
      case QueueName.EMAIL:
        return this.emailQueue;
      case QueueName.PDF_GENERATION:
        return this.pdfQueue;
      case QueueName.XML_PROCESSING:
        return this.xmlQueue;
      case QueueName.CFDI_TIMBRADO:
        return this.timbradoQueue;
      case QueueName.NOTIFICATION:
        return this.notificationQueue;
      case QueueName.REPORT_GENERATION:
        return this.reportQueue;
      case QueueName.INVENTORY_UPDATE:
        return this.inventoryQueue;
      case QueueName.ACCOUNTING:
        return this.accountingQueue;
      default:
        throw new Error(`Queue ${queueName} no encontrada`);
    }
  }
}