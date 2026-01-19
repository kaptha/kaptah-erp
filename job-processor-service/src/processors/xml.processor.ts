import { Processor, Process, OnQueueCompleted, OnQueueFailed } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger, Injectable } from '@nestjs/common';
import { QueueName } from '../config/queue.config';
import * as JSZip from 'jszip';
import * as xml2js from 'xml2js';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

interface XmlProcessJob {
  zipPath?: string;      // Ruta del ZIP
  xmlFile?: string;      // Nombre del archivo XML dentro del ZIP
  xmlContent?: string;   // O contenido directo del XML
  userId: string;
  empresaId: string;
  batchId: string;
  clientTier: 'free' | 'pro' | 'enterprise';
}

@Processor(QueueName.XML_PROCESSING)
export class XmlProcessor {
  private readonly logger = new Logger(XmlProcessor.name);

  constructor(
    @InjectQueue(QueueName.ACCOUNTING) private accountingQueue: Queue,
    @InjectQueue(QueueName.NOTIFICATION) private notificationQueue: Queue,
    @InjectQueue(QueueName.PDF_GENERATION) private pdfQueue: Queue,
    // Inyectar servicios necesarios
    // private readonly cfdiService: CfdiService,
    // private readonly validationService: ValidationService,
  ) {}

  @Process({ 
    name: 'procesar-xml', 
    concurrency: 8 // 8 jobs paralelos
  })
  async processXML(job: Job<XmlProcessJob>): Promise<any> {
    const { zipPath, xmlFile, xmlContent, userId, empresaId, batchId, clientTier } = job.data;
    
    this.logger.log(`Procesando XML: ${xmlFile || 'directo'} - Batch: ${batchId}`);

    try {
      // 1. Obtener contenido XML
      let content: string;
      
      if (xmlContent) {
        content = xmlContent;
      } else if (zipPath && xmlFile) {
        content = await this.extractXmlFromZip(zipPath, xmlFile);
      } else {
        throw new Error('Debe proporcionar xmlContent o zipPath+xmlFile');
      }

      // 2. Parse XML a JSON
      const cfdiData = await this.parseXML(content);

      // 3. Validar estructura CFDI 4.0
      const validation = await this.validateCFDI(cfdiData);
      if (!validation.isValid) {
        throw new Error(`XML inválido: ${validation.errors.join(', ')}`);
      }

      // 4. Extraer datos relevantes
      const extractedData = this.extractCFDIData(cfdiData);

      // 5. Guardar en base de datos
      const cfdi = await this.saveCFDI({
        ...extractedData,
        userId,
        empresaId,
        batchId,
        xmlOriginal: content,
        origen: 'carga_masiva',
        processedAt: new Date()
      });

      // 6. Crear jobs secundarios según tipo de CFDI
      await this.createSecondaryJobs(cfdi, clientTier);

      // 7. Actualizar progreso del batch
      await this.updateBatchProgress(batchId);

      return {
        success: true,
        cfdiId: cfdi.id,
        folio: cfdi.folio,
        uuid: cfdi.uuid
      };

    } catch (error) {
      this.logger.error(`Error procesando XML ${xmlFile}: ${error.message}`, error.stack);
      
      // Guardar error en DB para reporte
      await this.logFailedXML({
        batchId,
        xmlFile,
        error: error.message,
        userId,
        empresaId
      });

      // No lanzar error para que el batch continúe
      return {
        success: false,
        xmlFile,
        error: error.message
      };
    }
  }

  private async extractXmlFromZip(zipPath: string, xmlFile: string): Promise<string> {
    const fs = require('fs').promises;
    const zipBuffer = await fs.readFile(zipPath);
    const zip = await JSZip.loadAsync(zipBuffer);
    
    const file = zip.file(xmlFile);
    if (!file) {
      throw new Error(`Archivo ${xmlFile} no encontrado en ZIP`);
    }
    
    return await file.async('text');
  }

  private async parseXML(xmlContent: string): Promise<any> {
    const parser = new xml2js.Parser({
      explicitArray: false,
      mergeAttrs: true,
      xmlns: true
    });
    
    return await parser.parseStringPromise(xmlContent);
  }

  private async validateCFDI(cfdiData: any): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Validaciones básicas CFDI 4.0
    const comprobante = cfdiData['cfdi:Comprobante'];
    
    if (!comprobante) {
      errors.push('No se encontró el nodo Comprobante');
      return { isValid: false, errors };
    }

    if (comprobante.Version !== '4.0') {
      errors.push('Versión de CFDI no soportada. Se requiere 4.0');
    }

    if (!comprobante['$']['xmlns:cfdi'] || !comprobante['$']['xmlns:cfdi'].includes('4.0')) {
      errors.push('Namespace CFDI 4.0 no encontrado');
    }

    // Validar UUID en TimbreFiscalDigital
    const complemento = comprobante['cfdi:Complemento'];
    if (complemento) {
      const timbre = complemento['tfd:TimbreFiscalDigital'];
      if (!timbre || !timbre.UUID) {
        errors.push('UUID no encontrado en TimbreFiscalDigital');
      }
    }

    // Validar RFC emisor y receptor
    const emisor = comprobante['cfdi:Emisor'];
    const receptor = comprobante['cfdi:Receptor'];
    
    if (!emisor?.Rfc || !this.isValidRFC(emisor.Rfc)) {
      errors.push('RFC del emisor inválido');
    }
    
    if (!receptor?.Rfc || !this.isValidRFC(receptor.Rfc)) {
      errors.push('RFC del receptor inválido');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private isValidRFC(rfc: string): boolean {
    // RFC Persona Moral: 12 caracteres
    // RFC Persona Física: 13 caracteres
    const rfcRegex = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/;
    return rfcRegex.test(rfc);
  }

  private extractCFDIData(cfdiData: any): any {
    const comprobante = cfdiData['cfdi:Comprobante'];
    const emisor = comprobante['cfdi:Emisor'];
    const receptor = comprobante['cfdi:Receptor'];
    const complemento = comprobante['cfdi:Complemento'];
    const timbre = complemento?.['tfd:TimbreFiscalDigital'];

    return {
      // Datos del comprobante
      version: comprobante.Version,
      serie: comprobante.Serie || null,
      folio: comprobante.Folio || null,
      fecha: new Date(comprobante.Fecha),
      tipoComprobante: comprobante.TipoDeComprobante,
      metodoPago: comprobante.MetodoPago,
      formaPago: comprobante.FormaPago,
      moneda: comprobante.Moneda,
      tipoCambio: parseFloat(comprobante.TipoCambio || '1'),
      
      // Importes
      subTotal: parseFloat(comprobante.SubTotal),
      descuento: parseFloat(comprobante.Descuento || '0'),
      total: parseFloat(comprobante.Total),
      
      // Emisor
      emisorRfc: emisor.Rfc,
      emisorNombre: emisor.Nombre,
      emisorRegimenFiscal: emisor.RegimenFiscal,
      
      // Receptor
      receptorRfc: receptor.Rfc,
      receptorNombre: receptor.Nombre,
      receptorUsoCFDI: receptor.UsoCFDI,
      receptorRegimenFiscal: receptor.RegimenFiscalReceptor,
      receptorDomicilioFiscal: receptor.DomicilioFiscalReceptor,
      
      // Timbre
      uuid: timbre?.UUID,
      fechaTimbrado: timbre ? new Date(timbre.FechaTimbrado) : null,
      noCertificadoSAT: timbre?.NoCertificadoSAT,
      selloSAT: timbre?.SelloSAT,
      selloCFD: timbre?.SelloCFD,
      
      // Conceptos
      conceptos: this.extractConceptos(comprobante['cfdi:Conceptos']),
      
      // Impuestos
      impuestos: this.extractImpuestos(comprobante['cfdi:Impuestos'])
    };
  }

  private extractConceptos(conceptosNode: any): any[] {
    if (!conceptosNode) return [];
    
    const conceptos = Array.isArray(conceptosNode['cfdi:Concepto']) 
      ? conceptosNode['cfdi:Concepto']
      : [conceptosNode['cfdi:Concepto']];

    return conceptos.map(c => ({
      claveProdServ: c.ClaveProdServ,
      noIdentificacion: c.NoIdentificacion || null,
      cantidad: parseFloat(c.Cantidad),
      claveUnidad: c.ClaveUnidad,
      unidad: c.Unidad || null,
      descripcion: c.Descripcion,
      valorUnitario: parseFloat(c.ValorUnitario),
      importe: parseFloat(c.Importe),
      descuento: parseFloat(c.Descuento || '0'),
      objetoImp: c.ObjetoImp
    }));
  }

  private extractImpuestos(impuestosNode: any): any {
    if (!impuestosNode) return null;

    return {
      totalImpuestosRetenidos: parseFloat(impuestosNode.TotalImpuestosRetenidos || '0'),
      totalImpuestosTrasladados: parseFloat(impuestosNode.TotalImpuestosTrasladados || '0'),
      retenciones: this.extractRetenciones(impuestosNode['cfdi:Retenciones']),
      traslados: this.extractTraslados(impuestosNode['cfdi:Traslados'])
    };
  }

  private extractRetenciones(retencionesNode: any): any[] {
    if (!retencionesNode) return [];
    
    const retenciones = Array.isArray(retencionesNode['cfdi:Retencion'])
      ? retencionesNode['cfdi:Retencion']
      : [retencionesNode['cfdi:Retencion']];

    return retenciones.map(r => ({
      impuesto: r.Impuesto,
      importe: parseFloat(r.Importe)
    }));
  }

  private extractTraslados(trasladosNode: any): any[] {
    if (!trasladosNode) return [];
    
    const traslados = Array.isArray(trasladosNode['cfdi:Traslado'])
      ? trasladosNode['cfdi:Traslado']
      : [trasladosNode['cfdi:Traslado']];

    return traslados.map(t => ({
      base: parseFloat(t.Base),
      impuesto: t.Impuesto,
      tipoFactor: t.TipoFactor,
      tasaOCuota: parseFloat(t.TasaOCuota),
      importe: parseFloat(t.Importe)
    }));
  }

  private async saveCFDI(data: any): Promise<any> {
    // Aquí usarías tu CfdiService para guardar en DB
    // return await this.cfdiService.create(data);
    
    // Mock para el ejemplo
    return {
      id: 'cfdi-' + Math.random().toString(36).substr(2, 9),
      ...data
    };
  }

  private async createSecondaryJobs(cfdi: any, clientTier: string): Promise<void> {
    const priority = clientTier === 'enterprise' ? 1 : clientTier === 'pro' ? 3 : 5;

    // Si es factura de ingreso del proveedor → Crear CxP
    if (cfdi.tipoComprobante === 'I') {
      await this.accountingQueue.add('crear-cxp', {
        cfdiId: cfdi.id,
        monto: cfdi.total,
        proveedorRfc: cfdi.emisorRfc,
        empresaId: cfdi.empresaId
      }, { priority });
    }

    // Si es recibo de pago → Aplicar a CxC
    if (cfdi.tipoComprobante === 'P') {
      await this.accountingQueue.add('aplicar-pago', {
        cfdiId: cfdi.id,
        clienteRfc: cfdi.emisorRfc,
        empresaId: cfdi.empresaId
      }, { priority });
    }

    // Generar PDF si es cliente premium
    if (clientTier !== 'free') {
      await this.pdfQueue.add('generar-pdf', {
        cfdiId: cfdi.id,
        tipo: 'cfdi-cargado'
      }, { priority: priority + 2 }); // Menor prioridad que contabilidad
    }
  }

  private async updateBatchProgress(batchId: string): Promise<void> {
    // Actualizar contador en Redis
    // Enviar notificación WebSocket si está completo
    // await this.progressService.increment(batchId);
  }

  private async logFailedXML(data: any): Promise<void> {
    // Guardar en tabla de errores para reporte al usuario
    this.logger.warn(`XML fallido guardado: ${data.xmlFile}`);
  }

  @OnQueueCompleted()
  async onCompleted(job: Job<XmlProcessJob>, result: any) {
    if (result.success) {
      this.logger.log(`✓ XML procesado exitosamente: ${result.cfdiId}`);
    } else {
      this.logger.warn(`✗ XML procesado con errores: ${result.xmlFile}`);
    }

    // Verificar si es el último job del batch
    const isLastJob = await this.checkIfLastJobInBatch(job.data.batchId);
    
    if (isLastJob) {
      // Enviar notificación de batch completado
      await this.notificationQueue.add('batch-completado', {
        batchId: job.data.batchId,
        userId: job.data.userId,
        stats: await this.getBatchStats(job.data.batchId)
      });
    }
  }

  @OnQueueFailed()
  async onFailed(job: Job<XmlProcessJob>, error: Error) {
    this.logger.error(
      `Job ${job.id} falló: ${error.message}`,
      error.stack
    );
  }

  private async checkIfLastJobInBatch(batchId: string): Promise<boolean> {
    // Implementar lógica para verificar si quedan jobs del batch
    // Usar Redis counters
    return false; // Mock
  }

  private async getBatchStats(batchId: string): Promise<any> {
    // Obtener estadísticas del batch desde Redis o DB
    return {
      total: 0,
      exitosos: 0,
      fallidos: 0
    };
  }
}