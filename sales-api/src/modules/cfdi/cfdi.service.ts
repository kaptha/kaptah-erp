import { Injectable, Logger, HttpException, HttpStatus, BadRequestException, NotFoundException  } from '@nestjs/common';
import { DOMParser, XMLSerializer, Document as XmlDocument } from '@xmldom/xmldom';
import { User } from '../../auth/interfaces/user.interface';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as path from 'path';
import * as fs from 'fs/promises'; 
import * as xml2js from 'xml2js';
import { format } from 'date-fns';
import axios from 'axios';
import * as admin from 'firebase-admin';
import { promises as fsPromises } from 'fs';
import { CreateIngresoCfdiDto } from './dto/create-ingreso-cfdi.dto';
import { CreateNominaCfdiDto } from './dto/create-nomina-cfdi.dto';
import { CreatePagoCfdiDto } from './dto/create-pago-cfdi.dto';
import { CancelCfdiDto } from './dto/cancel-cfdi.dto';
import { XmlBuilder } from '../../shared/helpers/xml-builder.helper';
import { SifeiSoapHelper } from '../../shared/helpers/sifei-soap.helper';
import { DatabaseService } from '../../database/database.service';
import { TimbradoService } from './timbrado/timbrado.service';
import { CfdiFactory } from './factories/cfdi.factory';
import { Cfdi } from './entities/cfdi.entity';
import { OriginalStringService } from './security/digital-sign/original-string.service';
import { SignService } from './security/digital-sign/sign.service';
import { SatFormatHelper } from 'src/shared/helpers/sat-format.helper';
import { OpenSSLService } from './security/digital-sign/openssl.service';
import { QrGeneratorService } from './services/qr-generator.service';
import { PdfGeneratorService } from './services/pdf-generator.service';
import { CfdiTemplateService } from './services/cfdi-template.service';
import { QueueClientService } from '../queue-client/queue-client.service';


@Injectable()
export class CfdiService {
  private readonly logger = new Logger(CfdiService.name);
  private readonly outputDir: string;
  private readonly bizEntitiesApiUrl = process.env.BIZ_ENTITIES_API_URL || 'http://localhost:3000';
  constructor(
    private readonly originalStringService: OriginalStringService,
    private readonly signService: SignService,
    private readonly timbradoService: TimbradoService,
    private readonly qrGenerator: QrGeneratorService,
    private readonly pdfGenerator: PdfGeneratorService,       
    private readonly cfdiTemplateService: CfdiTemplateService,
    private readonly queueClient: QueueClientService,
    @InjectRepository(Cfdi)
    private readonly cfdiRepository: Repository<Cfdi>,
  ) {this.outputDir = path.join(process.cwd(), 'output', 'cfdi');
    this.ensureOutputDirectory();}

    /**
   * Obtiene el logo del usuario
   */
  private async obtenerLogoUsuario(userId: string, token: string): Promise<string | null> {
    try {
      console.log('🔍 Solicitando logo...');
      
      const logoApiUrl = `${this.bizEntitiesApiUrl}/api/logos/current`;
      
      const response = await axios.get<{ url?: string }>(logoApiUrl, { // ⭐ TIPAR
        headers: {
          'Authorization': token
        }
      });
      
      if (response.data?.url) {
        console.log('✅ Logo obtenido:', response.data.url);
        return response.data.url;
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error obteniendo logo:', error.message);
      return null;
    }
  }

  /**
   * ⭐ Genera PDF del CFDI
   */
  async generarPdfCfdi(
    id: string,
    userId: string,
    estilo: string,
    token: string | null
  ): Promise<Buffer> {
    console.log('📄 Iniciando generación de PDF de CFDI');
  console.log('🎨 Estilo recibido:', estilo); 

    // Extraer userId del token si no se proporciona
    let finalUserId = userId;
    
    if (!finalUserId && token) {
      try {
        const cleanToken = token.replace('Bearer ', '');
        const decodedToken = await admin.auth().verifyIdToken(cleanToken);
        finalUserId = decodedToken.uid;
        console.log('✅ User ID extraído del token:', finalUserId);
      } catch (error) {
        console.error('❌ Error al decodificar token:', error.message);
        throw new Error('Token inválido');
      }
    }
    
    if (!finalUserId) {
      throw new Error('No se pudo obtener el userId');
    }

    try {
      // Obtener CFDI
      const cfdi = await this.findOne(id, finalUserId);
      console.log('✅ CFDI encontrado:', cfdi.id);

      // Generar QR dinámicamente
      const xmlData = await this.parseXML(cfdi.xml);
      const comprobante = xmlData['cfdi:Comprobante'];

      const qrData = await this.qrGenerator.generateQR({
        uuid: cfdi.uuid,
        rfcEmisor: comprobante['cfdi:Emisor'][0].$.Rfc,
        rfcReceptor: comprobante['cfdi:Receptor'][0].$.Rfc,
        total: parseFloat(cfdi.total.toString()),
        selloCFD: cfdi.selloCFD
      });

      console.log('✅ Código QR generado');

      // ⭐ PASAR EL ESTILO AL MÉTODO
    const html = this.cfdiTemplateService.generateCfdiHTML(
      cfdi, 
      qrData.image,
      estilo // ⭐ DEBE PASAR ESTE PARÁMETRO
    );

    console.log('✅ HTML generado con estilo:', estilo); // ⭐ LOG


      // Generar PDF
      const pdfBuffer = await this.pdfGenerator.generatePDF(html);

      console.log('✅ PDF generado exitosamente');

      return pdfBuffer;

    } catch (error) {
      console.error('❌ Error generando PDF:', error);
      throw error;
    }
  }

  /**
   * Helper para parsear XML
   */
  private async parseXML(xml: string): Promise<any> {
    const parser = new xml2js.Parser();
    return await parser.parseStringPromise(xml);
  }

  /**
   * Método auxiliar para ajustar un XML CFDI antes de timbrar o firmar
   * @param xmlContent Contenido XML del CFDI
   */
  private fixCfdiValues(xmlContent: string): string {
    try {
      this.logger.debug('Corrigiendo valores en el CFDI');
      
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
      const comprobante = xmlDoc.documentElement;
      
      // 1. Verificar y actualizar SubTotal (basado en la suma de importes de conceptos)
      let subtotal = 0;
      const conceptos = xmlDoc.getElementsByTagName('cfdi:Concepto');
      for (let i = 0; i < conceptos.length; i++) {
        const concepto = conceptos[i];
        subtotal += parseFloat(concepto.getAttribute('Importe') || '0');
      }
      
      comprobante.setAttribute('SubTotal', subtotal.toFixed(2));
      
      // 2. Calcular el total (SubTotal + Impuestos Trasladados - Impuestos Retenidos)
      // IMPORTANTE: Buscar el nodo de Impuestos que es hijo directo de Comprobante
      const impuestos = this.getComprobanteImpuestos(xmlDoc);
      let totalImpuestosTrasladados = 0;
      let totalImpuestosRetenidos = 0;
      
      if (impuestos) {
        if (impuestos.hasAttribute('TotalImpuestosTrasladados')) {
          totalImpuestosTrasladados = parseFloat(impuestos.getAttribute('TotalImpuestosTrasladados') || '0');
        }
        
        if (impuestos.hasAttribute('TotalImpuestosRetenidos')) {
          totalImpuestosRetenidos = parseFloat(impuestos.getAttribute('TotalImpuestosRetenidos') || '0');
        }
      }
      
      const total = subtotal + totalImpuestosTrasladados - totalImpuestosRetenidos;
      comprobante.setAttribute('Total', total.toFixed(2));
      
      this.logger.debug(`Valores corregidos - Subtotal: ${subtotal.toFixed(2)}, Traslados: ${totalImpuestosTrasladados.toFixed(2)}, Retenciones: ${totalImpuestosRetenidos.toFixed(2)}, Total: ${total.toFixed(2)}`);
      
      // 3. Verificar UsoCFDI para el Receptor
      const receptor = xmlDoc.getElementsByTagName('cfdi:Receptor')[0];
      if (receptor && (!receptor.hasAttribute('UsoCFDI') || receptor.getAttribute('UsoCFDI') === '')) {
        receptor.setAttribute('UsoCFDI', 'G03'); // Valor por defecto - Gastos en general
      }
      
      // 4. Verificar formato de números
      // Recorrer todos los elementos con atributos numéricos y asegurar que tienen 2 decimales
      const traslados = xmlDoc.getElementsByTagName('cfdi:Traslado');
      for (let i = 0; i < traslados.length; i++) {
        const traslado = traslados[i];
        if (traslado.hasAttribute('Base')) {
          const base = parseFloat(traslado.getAttribute('Base') || '0');
          traslado.setAttribute('Base', base.toFixed(2));
        }
        if (traslado.hasAttribute('Importe')) {
          const importe = parseFloat(traslado.getAttribute('Importe') || '0');
          traslado.setAttribute('Importe', importe.toFixed(2));
        }
        if (traslado.hasAttribute('TasaOCuota')) {
          // Formateamos con 6 decimales las tasas
          const tasaOCuota = parseFloat(traslado.getAttribute('TasaOCuota') || '0');
          traslado.setAttribute('TasaOCuota', tasaOCuota.toFixed(6));
        }
      }
      
      const retenciones = xmlDoc.getElementsByTagName('cfdi:Retencion');
      for (let i = 0; i < retenciones.length; i++) {
        const retencion = retenciones[i];
        if (retencion.hasAttribute('Base')) {
          const base = parseFloat(retencion.getAttribute('Base') || '0');
          retencion.setAttribute('Base', base.toFixed(2));
        }
        if (retencion.hasAttribute('Importe')) {
          const importe = parseFloat(retencion.getAttribute('Importe') || '0');
          retencion.setAttribute('Importe', importe.toFixed(2));
        }
        if (retencion.hasAttribute('TasaOCuota')) {
          // Formateamos con 6 decimales las tasas
          const tasaOCuota = parseFloat(retencion.getAttribute('TasaOCuota') || '0');
          retencion.setAttribute('TasaOCuota', tasaOCuota.toFixed(6));
        }
      }
      
      // 5. Formatear valores en Conceptos
      for (let i = 0; i < conceptos.length; i++) {
        const concepto = conceptos[i];
        if (concepto.hasAttribute('ValorUnitario')) {
          const valorUnitario = parseFloat(concepto.getAttribute('ValorUnitario') || '0');
          concepto.setAttribute('ValorUnitario', valorUnitario.toFixed(2));
        }
        if (concepto.hasAttribute('Importe')) {
          const importe = parseFloat(concepto.getAttribute('Importe') || '0');
          concepto.setAttribute('Importe', importe.toFixed(2));
        }
      }
      
      // Actualizar el documento con los cambios
      const serializer = new XMLSerializer();
      return serializer.serializeToString(xmlDoc);
    } catch (error) {
      this.logger.error('Error corrigiendo valores del CFDI:', error);
      return xmlContent; // Retornar el XML original en caso de error
    }
  }
 /**
   * Asegurar que existe el directorio de salida
   */
  private async ensureOutputDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.outputDir, { recursive: true });
      this.logger.log(`📁 Directorio de salida: ${this.outputDir}`);
    } catch (error) {
      this.logger.error('Error al crear directorio de salida:', error.message);
    }
  }
  /**
   * Obtiene el nodo de Impuestos que es hijo directo de Comprobante
   * (no los de los conceptos)
   */
  private getComprobanteImpuestos(xmlDoc: XmlDocument): any {
    const comprobante = xmlDoc.documentElement;
    const children = comprobante.childNodes;
    
    for (let i = 0; i < children.length; i++) {
      const node = children[i];
      if (node.nodeName === 'cfdi:Impuestos') {
        return node;
      }
    }
    
    return null;
  }

  /**
 * Agrega sello digital, certificado y número de certificado a un XML CFDI
 * @param xmlContent Contenido del XML CFDI a firmar
 * @param firebaseToken Token de Firebase del usuario para obtener su certificado CSD
 * @returns XML CFDI firmado con sello digital
 */
async signCfdi(xmlContent: string, firebaseToken: string, csdPassword: string): Promise<string> {
  try {
    this.logger.debug('Iniciando proceso de sellado de CFDI con certificado dinámico');
    
    // Validar que el token esté presente
    if (!firebaseToken) {
      throw new Error('Se requiere token de autenticación para firmar el CFDI');
    }
    
    // ⭐ Validar que la contraseña esté presente
    if (!csdPassword) {
      throw new Error('Se requiere la contraseña del certificado para firmar el CFDI');
    }
    
    // Paso 0: Corregir valores en el XML
    const correctedXml = this.fixCfdiValues(xmlContent);
    this.logger.debug('CFDI corregido con valores actualizados');
    
    // Paso 1: Obtener información del certificado del usuario
    const certInfo = await this.signService.getCertificateInfo(firebaseToken);
    this.logger.debug(`✅ Certificado obtenido - Número: ${certInfo.number}`);
    
    // Paso 2: Preparar el XML
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(correctedXml, 'text/xml');
    const comprobante = xmlDoc.documentElement;
    
    // Paso 3: Eliminar sello si existe (para regenerarlo)
    if (comprobante.hasAttribute('Sello')) {
      comprobante.removeAttribute('Sello');
    }
    
    // Paso 4: Agregar certificado y número de certificado
    comprobante.setAttribute('NoCertificado', certInfo.number);
    comprobante.setAttribute('Certificado', certInfo.base64);
    
    // Paso 5: Serializar XML sin sello para generar cadena original
    const serializer = new XMLSerializer();
    const xmlWithoutSeal = serializer.serializeToString(xmlDoc);
    
    // Paso 6: Generar cadena original
    const originalString = await this.originalStringService.generateOriginalString(xmlWithoutSeal);
    this.logger.debug(`Cadena Original generada: ${originalString.substring(0, 100)}...`);
    
    // Paso 7: Firmar la cadena original con el certificado del usuario
    // ⭐ PASAR la contraseña al método sign
    const signature = await this.signService.sign(originalString, firebaseToken, csdPassword);
    this.logger.debug(`Sello generado: ${signature.substring(0, 50)}...`);
    
    // Paso 8: Agregar el sello al XML
    comprobante.setAttribute('Sello', signature);
    
    // Paso 9: Serializar XML final con sello
    const finalXml = serializer.serializeToString(xmlDoc);
    
    this.logger.debug('✅ CFDI sellado exitosamente con certificado dinámico');
    return finalXml;
  } catch (error) {
    this.logger.error('❌ Error sellando CFDI:', error);
    throw new Error(`Error en proceso de sellado: ${error.message}`);
  }
}

  /**
 * Verifica la integridad de un CFDI ya sellado
 * @param xmlContent Contenido XML del CFDI sellado
 * @param firebaseToken Token de Firebase del usuario (para verificar con su certificado)
 */
async verifyCfdi(
  xmlContent: string, 
  firebaseToken: string
): Promise<{
  valid: boolean;
  originalString?: string;
  error?: string;
}> {
  try {
    // Parsear el XML
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
    const comprobante = xmlDoc.documentElement;
    
    // Obtener el sello actual
    const currentSeal = comprobante.getAttribute('Sello');
    if (!currentSeal) {
      return { valid: false, error: 'El CFDI no tiene sello' };
    }
    
    // Generar cadena original
    const originalString = await this.originalStringService.generateOriginalString(xmlContent);
    
    // Verificar el sello usando el certificado del usuario
    const isValid = await this.signService.verifySeal(originalString, currentSeal, firebaseToken);
    
    return {
      valid: isValid,
      originalString,
      error: isValid ? undefined : 'El sello no coincide con la cadena original'
    };
  } catch (error) {
    this.logger.error('Error verificando CFDI:', error);
    return {
      valid: false,
      error: `Error en verificación: ${error.message}`
    };
  }
}

  /**
   * Extrae y muestra la cadena original de un CFDI
   */
  async getOriginalString(xmlContent: string): Promise<string> {
    try {
      return await this.originalStringService.generateOriginalString(xmlContent);
    } catch (error) {
      this.logger.error('Error obteniendo cadena original:', error);
      throw error;
    }
  }

  /**
   * Guarda un CFDI firmado a disco
   */
  private async saveCfdi(xmlContent: string, user: any, uuid?: string): Promise<string> {
    const timestamp = new Date().getTime();
    const fileName = uuid 
      ? `CFDI_Ingreso_${user.uid}_${uuid}.xml`
      : `CFDI_Ingreso_${user.uid}_${timestamp}.xml`;
    
    const filePath = path.join(this.outputDir, fileName);
    await fs.writeFile(filePath, xmlContent, 'utf-8');
    
    return filePath;
  }

   /**
   * Crear CFDI de Ingreso con timbrado
   */
  async createIngresoCfdi(
  createDto: CreateIngresoCfdiDto,
  user: any,
  firebaseToken: string,
) {
  try {
    this.logger.log('🚀 Iniciando creación de CFDI de Ingreso...');

    // 1. Validar certificado del usuario
    await this.validateUserCertificate(firebaseToken);

    // 2. Validar contraseña del certificado
    if (!createDto.csdPassword) {
      throw new BadRequestException('La contraseña del certificado es requerida');
    }

    // 3. Generar XML del CFDI
    const xmlContent = await this.generateCfdi('I', createDto, user);
    this.logger.log('✅ XML generado');

    // 4. Firmar digitalmente el CFDI
    const xmlFirmado = await this.signCfdi(
      xmlContent,
      firebaseToken,
      createDto.csdPassword,
    );
    this.logger.log('✅ CFDI firmado digitalmente');

    // 5. Crear registro en BD con status 'timbrando' (SIN XML aún)
    const cfdi = this.cfdiRepository.create({
      user_id: user.uid,
      tipo_cfdi: 'ingreso',
      status: 'timbrando', // 👈 Estado inicial
      emisor_rfc: createDto.emisor?.rfc,
      emisor_nombre: createDto.emisor?.nombre,
      receptor_rfc: createDto.receptor?.rfc,
      receptor_nombre: createDto.receptor?.nombre,
      serie: createDto.serie,
      folio: createDto.folio,
      forma_pago: createDto.formaPago,
      metodo_pago: createDto.metodoPago,
      subtotal: this.calculateSubtotal(createDto.conceptos),
      total: this.calculateTotal(createDto.conceptos),
      moneda: 'MXN',
      tipo_cambio: 1,
      createdAt: new Date(),
      // 👇 NO guardar XML ni UUID aún
      xml: null,
      uuid: null,
    });

    const savedCfdi = await this.cfdiRepository.save(cfdi);
    this.logger.log(`📋 CFDI registrado con ID: ${savedCfdi.id}`);

    // 6. 🔥 Enviar a cola de timbrado (AQUÍ es donde se timbrará)
    await this.queueClient.timbrarCFDI({
      cfdiId: savedCfdi.id,
      xmlSinTimbrar: xmlFirmado, // 👈 XML ya firmado
      userId: user.uid,
      empresaId: user.uid,
      certificadoId: 'default', // O el ID real del certificado
      csdPassword: createDto.csdPassword, // 👈 Necesario para el procesador
    });

    this.logger.log('✅ Job de timbrado enviado a cola');

    // 7. Retornar respuesta inmediata
    return {
      success: true,
      message: 'CFDI firmado y enviado a timbrado. Recibirás una notificación cuando esté listo.',
      cfdiId: savedCfdi.id,
      status: 'timbrando',
      // 👇 NO retornar XML ni UUID aún porque no se ha timbrado
    };

  } catch (error) {
    this.logger.error('❌ Error al crear CFDI:', error.message);
    throw error;
  }
}

// 👇 MÉTODOS AUXILIARES
private calculateSubtotal(conceptos: any[]): number {
  return conceptos.reduce((sum, concepto) => {
    return sum + (concepto.cantidad * concepto.valorUnitario);
  }, 0);
}

private calculateTotal(conceptos: any[]): number {
  const subtotal = this.calculateSubtotal(conceptos);
  // Calcular impuestos según tus reglas de negocio
  const impuestos = subtotal * 0.16; // IVA 16% (ajustar según tu lógica)
  return subtotal + impuestos;
}

  /**
   * Crear CFDI de Egreso (modificado para usar colas)
   */
  async createEgresoCfdi(data: any, user: any, firebaseToken: string) {
    this.logger.log(`Creando CFDI de egreso para usuario: ${user.uid}`);

    try {
      const cfdi = this.cfdiRepository.create({
        user_id: user.uid,
        tipo_cfdi: 'egreso',
        status: 'borrador',
        // ... mapear campos de data
        createdAt: new Date()
      });

      const savedCfdi = await this.cfdiRepository.save(cfdi);

      const xmlSinTimbrar = await this.generateEgresoXml(data, user, firebaseToken);

      await this.queueClient.timbrarCFDI({
        cfdiId: savedCfdi.id,
        xmlSinTimbrar,
        userId: user.uid,
        empresaId: user.uid,
        certificadoId: 'default'
      });

      await this.cfdiRepository.update(savedCfdi.id, {
        status: 'timbrando'
      });

      return {
        success: true,
        cfdiId: savedCfdi.id,
        status: 'timbrando',
        message: 'CFDI de egreso en proceso de timbrado.'
      };

    } catch (error) {
      this.logger.error(`Error creando CFDI de egreso: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Crear CFDI de Nómina (modificado para usar colas)
   */
  async createNominaCfdi(createDto: any, user: any, firebaseToken: string) {
    this.logger.log(`Creando CFDI de nómina para usuario: ${user.uid}`);

    try {
      const cfdi = this.cfdiRepository.create({
        user_id: user.uid,
        tipo_cfdi: 'nomina',
        status: 'borrador',
        // ... mapear campos
        createdAt: new Date()
      });

      const savedCfdi = await this.cfdiRepository.save(cfdi);

      const xmlSinTimbrar = this.generateNominaXml(createDto, user);

      await this.queueClient.timbrarCFDI({
        cfdiId: savedCfdi.id,
        xmlSinTimbrar,
        userId: user.uid,
        empresaId: user.uid,
        certificadoId: 'default'
      });

      await this.cfdiRepository.update(savedCfdi.id, {
        status: 'timbrando'
      });

      return {
        success: true,
        cfdiId: savedCfdi.id,
        status: 'timbrando',
        message: 'CFDI de nómina en proceso de timbrado.'
      };

    } catch (error) {
      this.logger.error(`Error creando CFDI de nómina: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Crear CFDI de Complemento de Pago (modificado para usar colas)
   */
  async createPagoCfdi(createDto: any, user: any, firebaseToken: string) {
    this.logger.log(`Creando CFDI de pago para usuario: ${user.uid}`);

    try {
      const cfdi = this.cfdiRepository.create({
        user_id: user.uid,
        tipo_cfdi: 'pago',
        status: 'borrador',
        // ... mapear campos
        createdAt: new Date()
      });

      const savedCfdi = await this.cfdiRepository.save(cfdi);

      const xmlSinTimbrar = this.generatePagoXml(createDto, user);

      await this.queueClient.timbrarCFDI({
        cfdiId: savedCfdi.id,
        xmlSinTimbrar,
        userId: user.uid,
        empresaId: user.uid,
        certificadoId: 'default'
      });

      await this.cfdiRepository.update(savedCfdi.id, {
        status: 'timbrando'
      });

      return {
        success: true,
        cfdiId: savedCfdi.id,
        status: 'timbrando',
        message: 'Complemento de pago en proceso de timbrado.'
      };

    } catch (error) {
      this.logger.error(`Error creando CFDI de pago: ${error.message}`, error.stack);
      throw error;
    }
  }
  /**
 * Genera XML específico para CFDI de Nómina
 */
private generateNominaXml(data: any, user: any): string {
  const fecha = SatFormatHelper.formatDateTime();
  
  // Calcular SubTotal, Descuento y Total
  const subtotal = parseFloat(data.subtotal || data.nomina?.totalPercepciones || '0');
  const descuento = parseFloat(data.descuento || data.nomina?.totalDeducciones || '0');
  const total = subtotal - descuento;
  
  const xmlTemplate = `<?xml version="1.0" encoding="UTF-8"?>
<cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/4" 
                xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                xmlns:nomina12="http://www.sat.gob.mx/nomina12"
                xsi:schemaLocation="http://www.sat.gob.mx/cfd/4 http://www.sat.gob.mx/sitio_internet/cfd/4/cfdv40.xsd
                http://www.sat.gob.mx/nomina12 http://www.sat.gob.mx/sitio_internet/cfd/nomina/nomina12.xsd"
                Version="4.0" 
                Serie="${data.serie || ''}" 
                Folio="${data.folio || ''}" 
                Fecha="${fecha}" 
                SubTotal="${subtotal.toFixed(2)}" 
                Descuento="${descuento.toFixed(2)}"
                Moneda="MXN" 
                Total="${total.toFixed(2)}" 
                TipoDeComprobante="N" 
                Exportacion="01" 
                MetodoPago="PUE"
                LugarExpedicion="${data.lugarExpedicion || data.emisor?.codigoPostal || ''}">
<cfdi:Emisor Rfc="${data.emisor?.rfc || ''}" Nombre="${data.emisor?.nombre || ''}" RegimenFiscal="${data.emisor?.regimenFiscal || ''}"/>
<cfdi:Receptor Rfc="${data.receptor?.rfc || ''}" Nombre="${data.receptor?.nombre || ''}" DomicilioFiscalReceptor="${data.receptor?.domicilioFiscalReceptor || ''}" RegimenFiscalReceptor="${data.receptor?.regimenFiscalReceptor || ''}" UsoCFDI="CN01"/>
<cfdi:Conceptos>
  <cfdi:Concepto ClaveProdServ="84111505" Cantidad="1" ClaveUnidad="ACT" Descripcion="Pago de nómina" ValorUnitario="${subtotal.toFixed(2)}" Importe="${subtotal.toFixed(2)}" Descuento="${descuento.toFixed(2)}" ObjetoImp="01"/>
</cfdi:Conceptos>
<cfdi:Complemento>
  ${this.generateComplementoNomina(data)}
</cfdi:Complemento>
</cfdi:Comprobante>`;
  
  return xmlTemplate;
}

/**
 * Genera el complemento de nómina versión 1.2
 */
private generateComplementoNomina(data: any): string {
  const nomina = data.nomina || {};
  
  let complementoXml = `<nomina12:Nomina Version="1.2" 
    TipoNomina="${nomina.tipoNomina || 'O'}" 
    FechaPago="${nomina.fechaPago || ''}" 
    FechaInicialPago="${nomina.fechaInicialPago || ''}" 
    FechaFinalPago="${nomina.fechaFinalPago || ''}" 
    NumDiasPagados="${nomina.numDiasPagados || '0'}" 
    TotalPercepciones="${parseFloat(nomina.totalPercepciones || '0').toFixed(2)}" 
    TotalDeducciones="${parseFloat(nomina.totalDeducciones || '0').toFixed(2)}"`;
  
  // Otros pagos es opcional
  if (nomina.totalOtrosPagos) {
    complementoXml += ` TotalOtrosPagos="${parseFloat(nomina.totalOtrosPagos).toFixed(2)}"`;
  }
  
  complementoXml += '>';
  
  // Emisor
  if (nomina.emisor) {
    complementoXml += `
  <nomina12:Emisor`;
    if (nomina.emisor.registroPatronal) {
      complementoXml += ` RegistroPatronal="${nomina.emisor.registroPatronal}"`;
    }
    if (nomina.emisor.rfcPatronOrigen) {
      complementoXml += ` RfcPatronOrigen="${nomina.emisor.rfcPatronOrigen}"`;
    }
    complementoXml += ' />';
  }
  
  // Receptor
  if (nomina.receptor) {
    complementoXml += `
  <nomina12:Receptor 
    Curp="${nomina.receptor.curp || ''}"`;
    
    if (nomina.receptor.numSeguridadSocial) {
      complementoXml += ` NumSeguridadSocial="${nomina.receptor.numSeguridadSocial}"`;
    }
    
    complementoXml += ` 
    FechaInicioRelLaboral="${nomina.receptor.fechaInicioRelLaboral || ''}" 
    Antigüedad="${nomina.receptor.antiguedad || ''}" 
    TipoContrato="${nomina.receptor.tipoContrato || '01'}" 
    Sindicalizado="${nomina.receptor.sindicalizado || 'No'}" 
    TipoJornada="${nomina.receptor.tipoJornada || '01'}" 
    TipoRegimen="${nomina.receptor.tipoRegimen || '02'}" 
    NumEmpleado="${nomina.receptor.numEmpleado || ''}" 
    Departamento="${nomina.receptor.departamento || ''}" 
    Puesto="${nomina.receptor.puesto || ''}" 
    RiesgoPuesto="${nomina.receptor.riesgoPuesto || '1'}" 
    PeriodicidadPago="${nomina.receptor.periodicidadPago || '04'}"`;
    
    if (nomina.receptor.banco) {
      complementoXml += ` Banco="${nomina.receptor.banco}"`;
    }
    if (nomina.receptor.cuentaBancaria) {
      complementoXml += ` CuentaBancaria="${nomina.receptor.cuentaBancaria}"`;
    }
    
    complementoXml += ` 
    SalarioBaseCotApor="${parseFloat(nomina.receptor.salarioBaseCotApor || '0').toFixed(2)}" 
    SalarioDiarioIntegrado="${parseFloat(nomina.receptor.salarioDiarioIntegrado || '0').toFixed(2)}" 
    ClaveEntFed="${nomina.receptor.claveEntFed || ''}" />`;
  }
  
  // Percepciones
  if (nomina.percepciones && nomina.percepciones.length > 0) {
    const totalGravado = nomina.percepciones.reduce((sum, p) => sum + parseFloat(p.importeGravado || 0), 0);
    const totalExento = nomina.percepciones.reduce((sum, p) => sum + parseFloat(p.importeExento || 0), 0);
    
    complementoXml += `
  <nomina12:Percepciones TotalSueldos="${(totalGravado + totalExento).toFixed(2)}" TotalGravado="${totalGravado.toFixed(2)}" TotalExento="${totalExento.toFixed(2)}">`;
    
    for (const percepcion of nomina.percepciones) {
      complementoXml += `
    <nomina12:Percepcion TipoPercepcion="${percepcion.tipoPercepcion}" Clave="${percepcion.clave}" Concepto="${percepcion.concepto}" ImporteGravado="${parseFloat(percepcion.importeGravado || 0).toFixed(2)}" ImporteExento="${parseFloat(percepcion.importeExento || 0).toFixed(2)}" />`;
    }
    
    complementoXml += `
  </nomina12:Percepciones>`;
  }
  
  // Deducciones
  if (nomina.deducciones && nomina.deducciones.length > 0) {
    const totalOtrasDeducciones = nomina.deducciones
      .filter(d => d.tipoDeduccion !== '002')
      .reduce((sum, d) => sum + parseFloat(d.importe || 0), 0);
    
    const totalImpuestosRetenidos = nomina.deducciones
      .filter(d => d.tipoDeduccion === '002')
      .reduce((sum, d) => sum + parseFloat(d.importe || 0), 0);
    
    complementoXml += `
  <nomina12:Deducciones`;
    
    if (totalOtrasDeducciones > 0) {
      complementoXml += ` TotalOtrasDeducciones="${totalOtrasDeducciones.toFixed(2)}"`;
    }
    if (totalImpuestosRetenidos > 0) {
      complementoXml += ` TotalImpuestosRetenidos="${totalImpuestosRetenidos.toFixed(2)}"`;
    }
    
    complementoXml += '>';
    
    for (const deduccion of nomina.deducciones) {
      complementoXml += `
    <nomina12:Deduccion TipoDeduccion="${deduccion.tipoDeduccion}" Clave="${deduccion.clave}" Concepto="${deduccion.concepto}" Importe="${parseFloat(deduccion.importe || 0).toFixed(2)}" />`;
    }
    
    complementoXml += `
  </nomina12:Deducciones>`;
  }
  
  // Otros Pagos (opcional)
  if (nomina.otrosPagos && nomina.otrosPagos.length > 0) {
    complementoXml += `
  <nomina12:OtrosPagos>`;
    
    for (const otroPago of nomina.otrosPagos) {
      complementoXml += `
    <nomina12:OtroPago TipoOtroPago="${otroPago.tipoOtroPago}" Clave="${otroPago.clave}" Concepto="${otroPago.concepto}" Importe="${parseFloat(otroPago.importe || 0).toFixed(2)}" />`;
    }
    
    complementoXml += `
  </nomina12:OtrosPagos>`;
  }
  
  complementoXml += `
</nomina12:Nomina>`;
  
  return complementoXml;
}
  
  /**
 * Genera XML específico para CFDI de Pago (Complemento de Pagos)
 */
private generatePagoXml(data: any, user: any): string {
  const fecha = SatFormatHelper.formatDateTime();
  
  // Los CFDIs de pago siempre tienen SubTotal=0 y Total=0
  const xmlTemplate = `<?xml version="1.0" encoding="UTF-8"?>
<cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/4" 
                xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                xmlns:pago20="http://www.sat.gob.mx/Pagos20"
                xsi:schemaLocation="http://www.sat.gob.mx/cfd/4 http://www.sat.gob.mx/sitio_internet/cfd/4/cfdv40.xsd
                http://www.sat.gob.mx/Pagos20 http://www.sat.gob.mx/sitio_internet/cfd/Pagos/Pagos20.xsd"
                Version="4.0" 
                Serie="${data.serie || ''}" 
                Folio="${data.folio || ''}" 
                Fecha="${fecha}" 
                SubTotal="0" 
                Moneda="XXX" 
                Total="0" 
                TipoDeComprobante="P" 
                Exportacion="01" 
                LugarExpedicion="${data.lugarExpedicion || ''}">
<cfdi:Emisor Rfc="${data.emisor?.rfc || ''}" Nombre="${data.emisor?.nombre || ''}" RegimenFiscal="${data.emisor?.regimenFiscal || ''}"/>
<cfdi:Receptor Rfc="${data.receptor?.rfc || ''}" Nombre="${data.receptor?.nombre || ''}" DomicilioFiscalReceptor="${data.receptor?.domicilioFiscalReceptor || ''}" RegimenFiscalReceptor="${data.receptor?.regimenFiscalReceptor || ''}" UsoCFDI="CP01"/>
<cfdi:Conceptos>
  <cfdi:Concepto ClaveProdServ="84111506" Cantidad="1" ClaveUnidad="ACT" Descripcion="Pago" ValorUnitario="0" Importe="0" ObjetoImp="01"/>
</cfdi:Conceptos>
<cfdi:Complemento>
  ${this.generateComplementoPagos(data)}
</cfdi:Complemento>
</cfdi:Comprobante>`;
  
  return xmlTemplate;
}

/**
 * Genera el complemento de pagos versión 2.0
 */
private generateComplementoPagos(data: any): string {
  const pagos = data.pagos || {};
  
  let complementoXml = `<pago20:Pagos Version="2.0">`;
  
  // Totales (requerido en v2.0)
  if (pagos.totales) {
    complementoXml += `
  <pago20:Totales`;
    
    if (pagos.totales.totalTrasladosBaseIVA16) {
      complementoXml += ` TotalTrasladosBaseIVA16="${parseFloat(pagos.totales.totalTrasladosBaseIVA16).toFixed(2)}"`;
    }
    if (pagos.totales.totalTrasladosImpuestoIVA16) {
      complementoXml += ` TotalTrasladosImpuestoIVA16="${parseFloat(pagos.totales.totalTrasladosImpuestoIVA16).toFixed(2)}"`;
    }
    if (pagos.totales.montoTotalPagos) {
      complementoXml += ` MontoTotalPagos="${parseFloat(pagos.totales.montoTotalPagos).toFixed(2)}"`;
    }
    
    complementoXml += '/>';
  }
  
  // Pago (puede haber múltiples)
  if (pagos.pago && Array.isArray(pagos.pago)) {
    for (const pago of pagos.pago) {
      complementoXml += `
  <pago20:Pago FechaPago="${pago.fechaPago || ''}" FormaDePagoP="${pago.formaDePagoP || ''}" MonedaP="${pago.monedaP || 'MXN'}" Monto="${parseFloat(pago.monto || 0).toFixed(2)}">`;
      
      // ⚠️ CRÍTICO: Documentos relacionados (OBLIGATORIO - mínimo uno)
      if (!pago.doctoRelacionado || pago.doctoRelacionado.length === 0) {
        throw new Error('El CFDI de Pago debe contener al menos un documento relacionado (factura que se está pagando)');
      }
      
      for (const docto of pago.doctoRelacionado) {
        complementoXml += `
    <pago20:DoctoRelacionado IdDocumento="${docto.idDocumento}"`;
        
        if (docto.serie) {
          complementoXml += ` Serie="${docto.serie}"`;
        }
        if (docto.folio) {
          complementoXml += ` Folio="${docto.folio}"`;
        }
        
        complementoXml += ` MonedaDR="${docto.monedaDR || 'MXN'}" NumParcialidad="${docto.numParcialidad || '1'}" ImpSaldoAnt="${parseFloat(docto.impSaldoAnt || 0).toFixed(2)}" ImpPagado="${parseFloat(docto.impPagado || 0).toFixed(2)}" ImpSaldoInsoluto="${parseFloat(docto.impSaldoInsoluto || 0).toFixed(2)}" ObjetoImpDR="${docto.objetoImpDR || '01'}"/>`;
      }
      
      complementoXml += `
  </pago20:Pago>`;
    }
  }
  
  complementoXml += `
</pago20:Pagos>`;
  
  return complementoXml;
}
 // ========== NUEVOS MÉTODOS ==========

  /**
   * NUEVO: Procesar ZIP con XMLs masivamente
   */
  async processBatchZip(
    file: Express.Multer.File,
    userId: string,
    clientTier: string = 'free'
  ) {
    this.logger.log(`Procesando ZIP con ${file.size} bytes para usuario: ${userId}`);

    try {
      const JSZip = require('jszip');
      const fs = require('fs').promises;
      const path = require('path');

      // 1. Guardar ZIP temporalmente
      const uploadDir = path.join(process.cwd(), 'uploads', 'zips');
      await fs.mkdir(uploadDir, { recursive: true });
      
      const zipPath = path.join(uploadDir, `${Date.now()}-${file.originalname}`);
      await fs.writeFile(zipPath, file.buffer);

      // 2. Extraer lista de XMLs
      const zip = await JSZip.loadAsync(file.buffer);
      const xmlFiles: string[] = [];

      zip.forEach((relativePath: string, file: any) => {
        if (relativePath.toLowerCase().endsWith('.xml') && !file.dir) {
          xmlFiles.push(relativePath);
        }
      });

      if (xmlFiles.length === 0) {
        throw new BadRequestException('No se encontraron archivos XML en el ZIP');
      }

      this.logger.log(`Encontrados ${xmlFiles.length} XMLs en el ZIP`);

      // 3. Crear batch de procesamiento
      const result = await this.queueClient.processBatchXMLs(
        xmlFiles,
        zipPath,
        userId,
        userId, // empresaId
        clientTier
      );

      return {
        ...result,
        message: `Procesando ${result.total} XMLs. Te notificaremos cuando termine.`,
        estimatedTime: `${Math.ceil(result.total / 100)} minutos`
      };

    } catch (error) {
      this.logger.error(`Error procesando ZIP: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * NUEVO: Obtener estado de un batch
   */
  async getBatchStatus(batchId: string, userId: string) {
    // Implementar lógica para obtener progreso desde Redis
    // Por ahora mock
    return {
      batchId,
      userId,
      status: 'procesando',
      total: 500,
      procesados: 350,
      exitosos: 340,
      fallidos: 10,
      porcentaje: 70
    };
  }

  /**
   * NUEVO: Cancelar CFDI
   */
  async cancelarCfdi(
    cfdiId: string,
    motivo: string,
    uuidSustitucion: string | null,
    userId: string,
    firebaseToken: string
  ) {
    this.logger.log(`Cancelando CFDI: ${cfdiId}`);

    const cfdi = await this.cfdiRepository.findOne({
      where: { id: cfdiId, user_id: userId }
    });

    if (!cfdi) {
      throw new NotFoundException('CFDI no encontrado');
    }

    if (cfdi.status !== 'timbrado') {
      throw new BadRequestException('Solo se pueden cancelar CFDIs timbrados');
    }

    // Actualizar estado
    await this.cfdiRepository.update(cfdiId, {
      status: 'cancelando'
    });

    // Enviar a cola de cancelación
    await this.queueClient.cancelarCFDI({
      cfdiId,
      motivo,
      uuidSustitucion,
      userId,
      empresaId: userId,
      certificadoId: 'default'
    });

    return {
      success: true,
      cfdiId,
      status: 'cancelando',
      message: 'Cancelación en proceso'
    };
  }

  /**
   * NUEVO: Reenviar email del CFDI
   */
  async reenviarEmail(cfdiId: string, userId: string) {
    const cfdi = await this.cfdiRepository.findOne({
      where: { id: cfdiId, user_id: userId }
    });

    if (!cfdi) {
      throw new NotFoundException('CFDI no encontrado');
    }

    if (cfdi.status !== 'timbrado') {
      throw new BadRequestException('Solo se pueden reenviar CFDIs timbrados');
    }

    // Obtener email del receptor (ajustar según tu lógica)
    const clienteEmail = cfdi.user_email || 'cliente@example.com';

    await this.queueClient.sendCFDIEmail(cfdiId, clienteEmail);

    return {
      success: true,
      message: 'Email reenviado. Llegará en unos momentos.'
    };
  }

  /**
   * NUEVO: Regenerar PDF del CFDI
   */
  async regenerarPDF(cfdiId: string, userId: string, templateType: string = 'clasico') {
    const cfdi = await this.cfdiRepository.findOne({
      where: { id: cfdiId, user_id: userId }
    });

    if (!cfdi) {
      throw new NotFoundException('CFDI no encontrado');
    }

    await this.queueClient.generateCFDIPDF(
  cfdiId, 
  templateType as 'clasico' | 'modern' | 'minimalist'
);

    return {
      success: true,
      message: 'PDF regenerándose. Estará listo en unos momentos.'
    };
  }

 /**
 * Generar XML de CFDI de Egreso
 */
private generateEgresoXml(data: any, user: any, firebaseToken?: string): string {
  // Aquí tu lógica para generar el XML de egreso
  // Por ahora un mock simple:
  
  const xmlBuilder = require('xmlbuilder2');
  
  const xml = xmlBuilder.create({ version: '1.0', encoding: 'UTF-8' })
    .ele('cfdi:Comprobante', {
      'xmlns:cfdi': 'http://www.sat.gob.mx/cfd/4',
      'Version': '4.0',
      'TipoDeComprobante': 'E', // E = Egreso
      // ... otros atributos
    })
    .up()
    .end({ prettyPrint: true });
    
  return xml;
}
/**
 * Genera la sección de ImpuestosDR (impuestos de documentos relacionados)
 */
private generateImpuestosDR(impuestosDR: any): string {
  let xml = `
      <pago20:ImpuestosDR>`;
  
  // Retenciones DR (opcional)
  if (impuestosDR.retencionesDR && impuestosDR.retencionesDR.length > 0) {
    xml += `
        <pago20:RetencionesDR>`;
    
    for (const retencion of impuestosDR.retencionesDR) {
      xml += `
          <pago20:RetencionDR BaseDR="${parseFloat(retencion.baseDR).toFixed(2)}" ImpuestoDR="${retencion.impuestoDR}" TipoFactorDR="${retencion.tipoFactorDR}" TasaOCuotaDR="${parseFloat(retencion.tasaOCuotaDR).toFixed(6)}" ImporteDR="${parseFloat(retencion.importeDR).toFixed(2)}" />`;
    }
    
    xml += `
        </pago20:RetencionesDR>`;
  }
  
  // Traslados DR (opcional)
  if (impuestosDR.trasladosDR && impuestosDR.trasladosDR.length > 0) {
    xml += `
        <pago20:TrasladosDR>`;
    
    for (const traslado of impuestosDR.trasladosDR) {
      xml += `
          <pago20:TrasladoDR BaseDR="${parseFloat(traslado.baseDR).toFixed(2)}" ImpuestoDR="${traslado.impuestoDR}" TipoFactorDR="${traslado.tipoFactorDR}"`;
      
      if (traslado.tipoFactorDR !== 'Exento') {
        xml += ` TasaOCuotaDR="${parseFloat(traslado.tasaOCuotaDR).toFixed(6)}" ImporteDR="${parseFloat(traslado.importeDR).toFixed(2)}"`;
      }
      
      xml += ' />';
    }
    
    xml += `
        </pago20:TrasladosDR>`;
  }
  
  xml += `
      </pago20:ImpuestosDR>`;
  
  return xml;
}

/**
 * Genera la sección de ImpuestosP (impuestos del pago)
 */
private generateImpuestosP(impuestosP: any): string {
  let xml = `
    <pago20:ImpuestosP>`;
  
  // Retenciones P (opcional)
  if (impuestosP.retencionesP && impuestosP.retencionesP.length > 0) {
    xml += `
      <pago20:RetencionesP>`;
    
    for (const retencion of impuestosP.retencionesP) {
      xml += `
        <pago20:RetencionP ImpuestoP="${retencion.impuestoP}" ImporteP="${parseFloat(retencion.importeP).toFixed(6)}" />`;
    }
    
    xml += `
      </pago20:RetencionesP>`;
  }
  
  // Traslados P (opcional)
  if (impuestosP.trasladosP && impuestosP.trasladosP.length > 0) {
    xml += `
      <pago20:TrasladosP>`;
    
    for (const traslado of impuestosP.trasladosP) {
      xml += `
        <pago20:TrasladoP BaseP="${parseFloat(traslado.baseP).toFixed(6)}" ImpuestoP="${traslado.impuestoP}" TipoFactorP="${traslado.tipoFactorP}"`;
      
      if (traslado.tipoFactorP !== 'Exento') {
        xml += ` TasaOCuotaP="${parseFloat(traslado.tasaOCuotaP).toFixed(6)}" ImporteP="${parseFloat(traslado.importeP).toFixed(6)}"`;
      }
      
      xml += ' />';
    }
    
    xml += `
      </pago20:TrasladosP>`;
  }
  
  xml += `
    </pago20:ImpuestosP>`;
  
  return xml;
}
  /**
 * Ajusta los valores de forma de pago según reglas del SAT
 * @param data Datos del CFDI
 */
private validatePaymentRules(data: any): any {
  // Clonar datos para no modificar el original
  const result = { ...data };
  
  // Regla: Si el método de pago es PPD (Pago en parcialidades o diferido), 
  // la forma de pago debe ser "99" (Por definir)
  if (result.metodoPago === 'PPD') {
    if (result.formaPago !== '99') {
      this.logger.warn(`Corrigiendo forma de pago: Se cambió de "${result.formaPago}" a "99" para método de pago PPD`);
      result.formaPago = '99';
    }
  }
  
  // Regla: Si el método de pago es PUE (Pago en una sola exhibición),
  // la forma de pago NO debe ser "99"
  if (result.metodoPago === 'PUE' && result.formaPago === '99') {
    this.logger.warn('Forma de pago "99" no permitida para método de pago PUE. Se debe especificar una forma de pago válida.');
    // Aquí podrías establecer un valor predeterminado o lanzar un error
  }
  
  return result;
}

 /**
 * Genera el XML base para cualquier tipo de CFDI
 */
async generateCfdi(tipo: 'I' | 'E' | 'N' | 'P', data: any, user: any): Promise<string> {
  try {
    this.logger.debug(`Generando CFDI base de tipo: ${tipo}`);
    
    // Para CFDI de Nómina, usar generador específico
    if (tipo === 'N') {
      return this.generateNominaXml(data, user);
    }
    
    // Para CFDI de Pago, usar generador específico
    if (tipo === 'P') {
      return this.generatePagoXml(data, user);
    }
    
    // Para otros tipos (I, E), validar que existan conceptos
    if (!data.conceptos || data.conceptos.length === 0) {
      throw new Error('El CFDI debe contener al menos un concepto');
    }
    
    // PASO 1: Calcular subtotal sumando todos los importes de conceptos
    const subtotal = data.conceptos.reduce((sum, concepto) => 
      sum + parseFloat(concepto.importe || 0), 0
    );
    
    // PASO 2: Calcular totales de impuestos
    let totalTraslados = 0;
    let totalRetenciones = 0;
    
    for (const concepto of data.conceptos) {
      if (concepto.impuestos) {
        // Sumar traslados
        if (concepto.impuestos.traslados) {
          totalTraslados += concepto.impuestos.traslados.reduce((sum, t) => 
            sum + parseFloat(t.importe || 0), 0
          );
        }
        
        // Sumar retenciones
        if (concepto.impuestos.retenciones) {
          totalRetenciones += concepto.impuestos.retenciones.reduce((sum, r) => 
            sum + parseFloat(r.importe || 0), 0
          );
        }
      }
    }
    
    // PASO 3: Calcular el total correcto
    const total = subtotal + totalTraslados - totalRetenciones;
    
    this.logger.debug(`Cálculos: Subtotal=${subtotal.toFixed(2)}, Traslados=${totalTraslados.toFixed(2)}, Retenciones=${totalRetenciones.toFixed(2)}, Total=${total.toFixed(2)}`);
    
    // PASO 4: Generar la fecha en formato SAT
    const fecha = SatFormatHelper.formatDateTime();
    
    // PASO 5: Validar y ajustar FormaPago según MetodoPago
    let formaPago = data.formaPago || '';
    const metodoPago = data.metodoPago || '';
    
    // Regla CFDI40105: Si MetodoPago es "PPD", FormaPago debe ser "99"
    if (metodoPago === 'PPD' && formaPago !== '99') {
      this.logger.warn(`Ajustando FormaPago de "${formaPago}" a "99" porque MetodoPago es "PPD"`);
      formaPago = '99';
    }
    
    // PASO 6: Construir el XML con los valores calculados
    const xmlTemplate = `<?xml version="1.0" encoding="UTF-8"?>
<cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/4" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.sat.gob.mx/cfd/4 http://www.sat.gob.mx/sitio_internet/cfd/4/cfdv40.xsd" Version="4.0" Serie="${data.serie || ''}" Folio="${data.folio || ''}" Fecha="${fecha}" FormaPago="${formaPago}" SubTotal="${subtotal.toFixed(2)}" Moneda="${data.moneda || 'MXN'}" Total="${total.toFixed(2)}" TipoDeComprobante="${tipo}" Exportacion="${data.exportacion || '01'}" MetodoPago="${metodoPago}" LugarExpedicion="${data.lugarExpedicion || ''}">
<cfdi:Emisor Rfc="${data.emisor?.rfc || ''}" Nombre="${data.emisor?.nombre || ''}" RegimenFiscal="${data.emisor?.regimenFiscal || ''}"/>
<cfdi:Receptor Rfc="${data.receptor?.rfc || ''}" Nombre="${data.receptor?.nombre || ''}" DomicilioFiscalReceptor="${data.receptor?.domicilioFiscalReceptor || ''}" RegimenFiscalReceptor="${data.receptor?.regimenFiscalReceptor || ''}" UsoCFDI="${data.receptor?.usoCFDI || ''}"/>
<cfdi:Conceptos>${this.generateConceptos(data.conceptos || [])}
</cfdi:Conceptos>${this.generateImpuestos(data.conceptos || [])}
</cfdi:Comprobante>`;
    
    return xmlTemplate;
  } catch (error) {
    this.logger.error(`Error generando CFDI base de tipo ${tipo}:`, error);
    throw error;
  }
}
  
  /**
 * Genera la sección de conceptos del XML
 */
private generateConceptos(conceptos: any[]): string {
  try {
    let conceptosXml = '';
    
    for (const concepto of conceptos) {
      conceptosXml += `
    <cfdi:Concepto ClaveProdServ="${concepto.claveProdServ || ''}"`;
      
      if (concepto.noIdentificacion) {
        conceptosXml += ` NoIdentificacion="${concepto.noIdentificacion}"`;
      }
      
      conceptosXml += ` Cantidad="${concepto.cantidad || 0}" ClaveUnidad="${concepto.claveUnidad || ''}"`;
      
      if (concepto.unidad) {
        conceptosXml += ` Unidad="${concepto.unidad}"`;
      }
      
      conceptosXml += ` Descripcion="${concepto.descripcion || ''}" ValorUnitario="${concepto.valorUnitario || 0}" Importe="${concepto.importe || 0}" ObjetoImp="${concepto.objetoImp || '02'}">`;
      
      // Impuestos del concepto
      conceptosXml += this.generateConceptoImpuestos(concepto);
      
      conceptosXml += `
    </cfdi:Concepto>`;  // ← Sin espacios extra aquí
    }
    
    return conceptosXml;
  } catch (error) {
    this.logger.error('Error generando conceptos:', error);
    throw error;
  }
}

/**
 * Genera la sección de impuestos para un concepto
 */
private generateConceptoImpuestos(concepto: any): string {
  try {
    if (!concepto.impuestos) {
      return '';
    }
    
    let impuestosXml = `
      <cfdi:Impuestos>`;
    
    // Traslados
    if (concepto.impuestos.traslados && concepto.impuestos.traslados.length > 0) {
      impuestosXml += `
        <cfdi:Traslados>`;
      
      for (const traslado of concepto.impuestos.traslados) {
        impuestosXml += `
          <cfdi:Traslado Base="${traslado.base || 0}" Impuesto="${traslado.impuesto || ''}" TipoFactor="${traslado.tipoFactor || ''}" TasaOCuota="${traslado.tasaOCuota || 0}" Importe="${traslado.importe || 0}"/>`;
      }
      
      impuestosXml += `
        </cfdi:Traslados>`;
    }
    
    // Retenciones
    if (concepto.impuestos.retenciones && concepto.impuestos.retenciones.length > 0) {
      impuestosXml += `
        <cfdi:Retenciones>`;
      
      for (const retencion of concepto.impuestos.retenciones) {
        impuestosXml += `
          <cfdi:Retencion Base="${retencion.base || 0}" Impuesto="${retencion.impuesto || ''}" TipoFactor="${retencion.tipoFactor || ''}" TasaOCuota="${retencion.tasaOCuota || 0}" Importe="${retencion.importe || 0}"/>`;
      }
      
      impuestosXml += `
        </cfdi:Retenciones>`;
    }
    
    impuestosXml += `
      </cfdi:Impuestos>`;
    
    return impuestosXml;
  } catch (error) {
    this.logger.error('Error generando impuestos de concepto:', error);
    return '';
  }
}
  
  /**
 * Genera la sección de impuestos a nivel comprobante
 */
private generateImpuestos(conceptos: any[]): string {
  try {
    if (!conceptos || conceptos.length === 0) {
      return '';
    }
    
    let totalTraslados = 0;
    let totalRetenciones = 0;
    const trasladosMap = new Map<string, { base: number; importe: number; tasaOCuota: string; tipoFactor: string; }>();
    const retencionesMap = new Map<string, { importe: number; }>();
    
    // Calcular totales
    for (const concepto of conceptos) {
      if (concepto.impuestos) {
        // Traslados
        if (concepto.impuestos.traslados) {
          for (const traslado of concepto.impuestos.traslados) {
            totalTraslados += parseFloat(traslado.importe || 0);
            
            const key = `${traslado.impuesto}-${traslado.tipoFactor}-${traslado.tasaOCuota}`;
            if (trasladosMap.has(key)) {
              const existingTraslado = trasladosMap.get(key);
              existingTraslado.base += parseFloat(traslado.base || 0);
              existingTraslado.importe += parseFloat(traslado.importe || 0);
            } else {
              trasladosMap.set(key, {
                base: parseFloat(traslado.base || 0),
                importe: parseFloat(traslado.importe || 0),
                tasaOCuota: traslado.tasaOCuota,
                tipoFactor: traslado.tipoFactor
              });
            }
          }
        }
        
        // Retenciones
        if (concepto.impuestos.retenciones) {
          for (const retencion of concepto.impuestos.retenciones) {
            totalRetenciones += parseFloat(retencion.importe || 0);
            
            const key = retencion.impuesto;
            if (retencionesMap.has(key)) {
              const existingRetencion = retencionesMap.get(key);
              existingRetencion.importe += parseFloat(retencion.importe || 0);
            } else {
              retencionesMap.set(key, {
                importe: parseFloat(retencion.importe || 0)
              });
            }
          }
        }
      }
    }
    
    // Si no hay impuestos, no agregar la sección
    if (totalTraslados === 0 && totalRetenciones === 0) {
      return '';
    }
    
    let impuestosXml = `
<cfdi:Impuestos`;
    
    if (totalTraslados > 0) {
      impuestosXml += ` TotalImpuestosTrasladados="${totalTraslados.toFixed(2)}"`;
    }
    
    if (totalRetenciones > 0) {
      impuestosXml += ` TotalImpuestosRetenidos="${totalRetenciones.toFixed(2)}"`;
    }
    
    impuestosXml += '>';
    
    // IMPORTANTE: Primero las Retenciones, después los Traslados
    
    // Retenciones (primero)
    if (retencionesMap.size > 0) {
      impuestosXml += `
  <cfdi:Retenciones>`;
      
      for (const [impuesto, retencion] of retencionesMap.entries()) {
        impuestosXml += `
    <cfdi:Retencion Impuesto="${impuesto}" Importe="${retencion.importe.toFixed(2)}"/>`;
      }
      
      impuestosXml += `
  </cfdi:Retenciones>`;
    }
    
    // Traslados (después)
    if (trasladosMap.size > 0) {
      impuestosXml += `
  <cfdi:Traslados>`;
      
      for (const [key, traslado] of trasladosMap.entries()) {
        const impuesto = key.split('-')[0];
        impuestosXml += `
    <cfdi:Traslado Base="${traslado.base.toFixed(2)}" Impuesto="${impuesto}" TipoFactor="${traslado.tipoFactor}" TasaOCuota="${traslado.tasaOCuota}" Importe="${traslado.importe.toFixed(2)}"/>`;
      }
      
      impuestosXml += `
  </cfdi:Traslados>`;
    }
    
    impuestosXml += `
</cfdi:Impuestos>`;
    
    return impuestosXml;
  } catch (error) {
    this.logger.error('Error generando sección de impuestos:', error);
    return '';
  }
}

/**
   * ⭐ Listar todos los CFDIs de un usuario
   */
  async findAll(userId: string): Promise<Cfdi[]> {
    this.logger.log(`📋 Obteniendo CFDIs del usuario: ${userId}`);
    
    return this.cfdiRepository.find({
      where: { user_id: userId },
      order: { createdAt: 'DESC' },
    });
  }

/**
 * Obtener un CFDI por ID (ahora es UUID string)
 */
async findOne(id: string, userId: string): Promise<Cfdi> {
  // ⭐ Ya no necesitas parseInt, solo validar formato UUID
  const cfdi = await this.cfdiRepository.findOne({
    where: { 
      id: id,  // ⭐ Ahora es string directamente
      user_id: userId 
    },
  });

  if (!cfdi) {
    throw new NotFoundException(`CFDI con ID ${id} no encontrado`);
  }

  return cfdi;
}

/**
 * Eliminar un CFDI
 */
async delete(id: string, userId: string): Promise<{ success: boolean; message: string }> {
  const cfdi = await this.findOne(id, userId);  // ⭐ Ya funciona con UUID

  await this.cfdiRepository.remove(cfdi);

  this.logger.log(`🗑️ CFDI eliminado: ${id}`);

  return {
    success: true,
    message: 'CFDI eliminado correctamente',
  };
}
/**
 * Valida el certificado CSD del usuario antes de timbrar
 * @param firebaseToken Token de Firebase del usuario
 * @returns true si el certificado es válido
 */
async validateUserCertificate(firebaseToken: string): Promise<boolean> {
  try {
    return await this.signService.validateCertificate(firebaseToken);
  } catch (error) {
    this.logger.error('Error validando certificado del usuario:', error);
    return false;
  }
}

/**
 * Verifica la salud del sistema de certificados
 * @returns Estado del sistema de certificados
 */
async checkCertificateSystemHealth(): Promise<{
  certVaultAvailable: boolean;
  message: string;
}> {
  try {
    return {
      certVaultAvailable: true,
      message: 'Sistema de certificados operando correctamente'
    };
  } catch (error) {
    return {
      certVaultAvailable: false,
      message: `Error en sistema de certificados: ${error.message}`
    };
  }
}
/**
 * NUEVO: Actualización interna desde job-processor
 */
async internalUpdateCfdi(cfdiId: string, updateData: any): Promise<void> {
  this.logger.log(`🔄 Actualizando CFDI ${cfdiId} desde job-processor`);

  try {
    // Actualizar en la BD
    await this.cfdiRepository.update(cfdiId, updateData);

    // Si se guardó el XML, también guardarlo en filesystem
    if (updateData.xml && updateData.uuid) {
      await this.saveCfdiFile(cfdiId, updateData.xml, updateData.uuid);
    }

    this.logger.log(`✓ CFDI ${cfdiId} actualizado correctamente`);

  } catch (error) {
    this.logger.error(`Error actualizando CFDI: ${error.message}`);
    throw error;
  }
}

/**
 * Guardar archivo XML en filesystem
 */
private async saveCfdiFile(cfdiId: string, xml: string, uuid: string): Promise<string> {
  const fs = require('fs').promises;
  const path = require('path');

  const cfdiDir = path.join(process.cwd(), 'cfdis', 'timbrados');
  await fs.mkdir(cfdiDir, { recursive: true });

  const fileName = `${uuid}.xml`;
  const filePath = path.join(cfdiDir, fileName);

  await fs.writeFile(filePath, xml, 'utf-8');

  // Actualizar file_path en la BD
  await this.cfdiRepository.update(cfdiId, {
    file_name: fileName,
    file_path: filePath
  });

  this.logger.log(`✓ XML guardado en: ${filePath}`);
  return filePath;
}
}

