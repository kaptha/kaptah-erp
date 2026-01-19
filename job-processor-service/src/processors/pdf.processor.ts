import { Processor, Process, OnQueueCompleted, OnQueueFailed } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { QueueName } from '../config/queue.config';
import * as puppeteer from 'puppeteer';
import * as Handlebars from 'handlebars';
import * as fs from 'fs/promises';
import * as path from 'path';

interface PdfJob {
  entityId: string;
  entityType: 'cfdi' | 'nota-venta' | 'cotizacion' | 'orden-venta' | 'nota-entrega' | 'complemento-pago';
  template: string;
  data?: any; // Si ya tienes los datos, sino los obtiene
  outputPath?: string; // Donde guardar el PDF
  userId: string;
  empresaId: string;
}

@Processor(QueueName.PDF_GENERATION)
export class PdfProcessor {
  private readonly logger = new Logger(PdfProcessor.name);
  private browser: puppeteer.Browser;
  private templates: Map<string, HandlebarsTemplateDelegate> = new Map();

  constructor() {
    this.initBrowser();
    this.loadTemplates();
  }

  private async initBrowser() {
    this.browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage'
      ]
    });
    this.logger.log('Puppeteer browser iniciado');
  }

  private async loadTemplates() {
    // Registrar helpers de Handlebars
    Handlebars.registerHelper('formatCurrency', (value: number) => {
      return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN'
      }).format(value);
    });

    Handlebars.registerHelper('formatDate', (date: Date) => {
      return new Intl.DateTimeFormat('es-MX', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }).format(new Date(date));
    });

    Handlebars.registerHelper('formatDateTime', (date: Date) => {
      return new Intl.DateTimeFormat('es-MX', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }).format(new Date(date));
    });

    // Cargar templates desde archivos
    const templatesDir = path.join(__dirname, '..', '..', 'templates', 'pdf');
    const templateFiles = await fs.readdir(templatesDir);

    for (const file of templateFiles) {
      if (file.endsWith('.hbs')) {
        const templateName = file.replace('.hbs', '');
        const templateContent = await fs.readFile(
          path.join(templatesDir, file),
          'utf-8'
        );
        this.templates.set(templateName, Handlebars.compile(templateContent));
      }
    }

    this.logger.log(`${this.templates.size} templates PDF cargados`);
  }

  @Process({ 
    name: 'generar-pdf', 
    concurrency: 3 // 3 PDFs en paralelo
  })
  async generatePDF(job: Job<PdfJob>): Promise<any> {
    const { entityId, entityType, template, data, outputPath, userId, empresaId } = job.data;

    this.logger.log(`Generando PDF: ${entityType} ${entityId}`);

    try {
      // 1. Obtener datos si no fueron proporcionados
      const pdfData = data || await this.getEntityData(entityId, entityType);

      // 2. Obtener template
      const templateFn = this.templates.get(template);
      if (!templateFn) {
        throw new Error(`Template ${template} no encontrado`);
      }

      // 3. Renderizar HTML
      const html = templateFn(pdfData);

      // 4. Generar PDF con Puppeteer
      const page = await this.browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });

      const pdfPath = outputPath || this.getDefaultOutputPath(entityId, entityType);
      
      // Asegurar que el directorio existe
      await fs.mkdir(path.dirname(pdfPath), { recursive: true });

      await page.pdf({
        path: pdfPath,
        format: 'Letter',
        printBackground: true,
        margin: {
          top: '0.5cm',
          right: '0.5cm',
          bottom: '0.5cm',
          left: '0.5cm'
        }
      });

      await page.close();

      // 5. Marcar en Redis que el PDF está listo
      await this.markPDFReady(entityId, entityType, pdfPath);

      // 6. Actualizar registro en DB
      await this.updateEntityPDFStatus(entityId, entityType, pdfPath);

      this.logger.log(`✓ PDF generado: ${pdfPath}`);

      return {
        success: true,
        path: pdfPath,
        entityId,
        entityType
      };

    } catch (error) {
      this.logger.error(`Error generando PDF: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Process({ 
    name: 'generar-pdf-cfdi', 
    concurrency: 3 
  })
  async generateCFDIPDF(job: Job): Promise<any> {
    const { cfdiId, templateType } = job.data;

    // Obtener datos del CFDI
    const cfdi = await this.getCFDIData(cfdiId);

    // Seleccionar template según tipo
    let template = 'cfdi-clasico';
    if (templateType === 'modern') template = 'cfdi-moderno';
    if (templateType === 'minimalist') template = 'cfdi-minimalista';

    return await this.generatePDF({
      data: {
        entityId: cfdiId,
        entityType: 'cfdi',
        template,
        data: cfdi,
        userId: cfdi.userId,
        empresaId: cfdi.empresaId
      }
    } as Job<PdfJob>);
  }

  @Process({ 
    name: 'generar-pdf-nota-venta', 
    concurrency: 5 
  })
  async generateSaleNotePDF(job: Job): Promise<any> {
    const { notaId } = job.data;

    const nota = await this.getSaleNoteData(notaId);

    return await this.generatePDF({
      data: {
        entityId: notaId,
        entityType: 'nota-venta',
        template: 'nota-venta',
        data: nota,
        userId: nota.userId,
        empresaId: nota.empresaId
      }
    } as Job<PdfJob>);
  }

  @Process({ 
    name: 'generar-reporte', 
    concurrency: 1 // Reportes son pesados, 1 a la vez
  })
  async generateReport(job: Job): Promise<any> {
    const { reportType, filters, userId, empresaId } = job.data;

    this.logger.log(`Generando reporte: ${reportType}`);

    // Obtener datos del reporte según tipo
    const reportData = await this.getReportData(reportType, filters, empresaId);

    return await this.generatePDF({
      data: {
        entityId: `report-${Date.now()}`,
        entityType: 'cfdi', // Generic
        template: `reporte-${reportType}`,
        data: reportData,
        userId,
        empresaId
      }
    } as Job<PdfJob>);
  }

  // ========== MÉTODOS AUXILIARES ==========

  private async getEntityData(entityId: string, entityType: string): Promise<any> {
    switch (entityType) {
      case 'cfdi':
        return await this.getCFDIData(entityId);
      case 'nota-venta':
        return await this.getSaleNoteData(entityId);
      case 'cotizacion':
        return await this.getQuotationData(entityId);
      case 'orden-venta':
        return await this.getSalesOrderData(entityId);
      default:
        throw new Error(`Tipo de entidad no soportado: ${entityType}`);
    }
  }

  private getDefaultOutputPath(entityId: string, entityType: string): string {
    const baseDir = process.env.PDF_OUTPUT_DIR || '/tmp/pdfs';
    return path.join(baseDir, entityType, `${entityId}.pdf`);
  }

  private async markPDFReady(entityId: string, entityType: string, pdfPath: string): Promise<void> {
    // Guardar en Redis para que otros servicios sepan que está listo
    // await redisClient.set(`pdf:${entityType}:${entityId}`, pdfPath, 'EX', 3600);
    this.logger.log(`PDF marcado como listo: ${entityType}:${entityId}`);
  }

  private async updateEntityPDFStatus(
    entityId: string, 
    entityType: string, 
    pdfPath: string
  ): Promise<void> {
    // Actualizar en DB que el PDF está generado
    this.logger.log(`Estado PDF actualizado en DB: ${entityId}`);
  }

  private async getCFDIData(cfdiId: string): Promise<any> {
    // Obtener desde DB
    return {
      id: cfdiId,
      version: '4.0',
      serie: 'A',
      folio: '123',
      fecha: new Date(),
      emisorRfc: 'AAA010101AAA',
      emisorNombre: 'Mi Empresa SA de CV',
      emisorRegimenFiscal: '601',
      receptorRfc: 'XAXX010101000',
      receptorNombre: 'Cliente Test',
      receptorUsoCFDI: 'G03',
      subTotal: 1000,
      descuento: 0,
      total: 1160,
      uuid: '12345678-1234-1234-1234-123456789012',
      conceptos: [
        {
          claveProdServ: '01010101',
          noIdentificacion: 'PROD-001',
          cantidad: 1,
          claveUnidad: 'H87',
          descripcion: 'Producto de prueba',
          valorUnitario: 1000,
          importe: 1000
        }
      ],
      impuestos: {
        totalImpuestosTrasladados: 160,
        traslados: [
          {
            impuesto: '002',
            tipoFactor: 'Tasa',
            tasaOCuota: 0.16,
            importe: 160
          }
        ]
      },
      userId: 'user-123',
      empresaId: 'emp-123'
    }; // Mock
  }

  private async getSaleNoteData(notaId: string): Promise<any> {
    return {
      id: notaId,
      folio: 'NV-001',
      fecha: new Date(),
      clienteNombre: 'Cliente Test',
      clienteDireccion: 'Calle Falsa 123',
      empresaNombre: 'Mi Empresa',
      empresaDireccion: 'Av. Principal 456',
      items: [
        {
          descripcion: 'Producto 1',
          cantidad: 2,
          precioUnitario: 100,
          subtotal: 200
        }
      ],
      subtotal: 200,
      iva: 32,
      total: 232,
      userId: 'user-123',
      empresaId: 'emp-123'
    }; // Mock
  }

  private async getQuotationData(quotationId: string): Promise<any> {
    return {}; // Mock
  }

  private async getSalesOrderData(orderId: string): Promise<any> {
    return {}; // Mock
  }

  private async getReportData(reportType: string, filters: any, empresaId: string): Promise<any> {
    // Obtener datos según tipo de reporte
    return {
      reportType,
      filters,
      generatedAt: new Date(),
      data: []
    }; // Mock
  }

  @OnQueueCompleted()
  onCompleted(job: Job, result: any) {
    this.logger.log(`✓ PDF generado: ${result.path}`);
  }

  @OnQueueFailed()
  onFailed(job: Job, error: Error) {
    this.logger.error(`✗ PDF falló: Job ${job.id} - ${error.message}`);
  }

  async onModuleDestroy() {
    if (this.browser) {
      await this.browser.close();
      this.logger.log('Puppeteer browser cerrado');
    }
  }
}