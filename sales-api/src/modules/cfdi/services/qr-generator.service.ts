import { Injectable, Logger } from '@nestjs/common';
import * as QRCode from 'qrcode';

@Injectable()
export class QrGeneratorService {
  private readonly logger = new Logger(QrGeneratorService.name);

  /**
   * Genera la URL de verificación del SAT para el QR
   * @param cfdiData Datos del CFDI timbrado
   * @returns URL de verificación del SAT
   */
  generateQRUrl(cfdiData: {
    uuid: string;
    rfcEmisor: string;
    rfcReceptor: string;
    total: number;
    selloCFD: string;
  }): string {
    try {
      // Últimos 8 caracteres del sello
      const selloShort = cfdiData.selloCFD.slice(-8);

      // Total con 6 decimales (según especificación SAT)
      const totalFormatted = parseFloat(cfdiData.total.toString()).toFixed(6);

      // Construir URL del SAT
      const qrUrl =
        `https://verificacfdi.facturaelectronica.sat.gob.mx/default.aspx?` +
        `id=${cfdiData.uuid}` +
        `&re=${cfdiData.rfcEmisor}` +
        `&rr=${cfdiData.rfcReceptor}` +
        `&tt=${totalFormatted}` +
        `&fe=${selloShort}`;

      this.logger.log(`📱 URL QR generada: ${qrUrl.substring(0, 100)}...`);

      return qrUrl;
    } catch (error) {
      this.logger.error('❌ Error generando URL del QR:', error);
      throw new Error(`Error generando URL del QR: ${error.message}`);
    }
  }

  /**
   * Genera imagen del código QR en formato base64
   * @param qrUrl URL de verificación del SAT
   * @returns Imagen QR en base64 (data URL)
   */
  async generateQRImage(qrUrl: string): Promise<string> {
    try {
      this.logger.log('🎨 Generando imagen del QR...');

      const qrImageBase64 = await QRCode.toDataURL(qrUrl, {
        errorCorrectionLevel: 'M', // Nivel medio de corrección de errores
        type: 'image/png',
        width: 200, // Tamaño del QR
        margin: 1, // Margen blanco alrededor
        color: {
          dark: '#000000', // Color negro para el QR
          light: '#FFFFFF' // Fondo blanco
        }
      });

      this.logger.log('✅ Imagen QR generada correctamente');

      return qrImageBase64;
    } catch (error) {
      this.logger.error('❌ Error generando imagen del QR:', error);
      throw new Error(`Error generando imagen del QR: ${error.message}`);
    }
  }

  /**
   * Genera tanto la URL como la imagen del QR en un solo método
   * @param cfdiData Datos del CFDI timbrado
   * @returns Objeto con URL y imagen base64
   */
  async generateQR(cfdiData: {
    uuid: string;
    rfcEmisor: string;
    rfcReceptor: string;
    total: number;
    selloCFD: string;
  }): Promise<{ url: string; image: string }> {
    try {
      // 1. Generar URL
      const url = this.generateQRUrl(cfdiData);

      // 2. Generar imagen
      const image = await this.generateQRImage(url);

      return { url, image };
    } catch (error) {
      this.logger.error('❌ Error en generateQR:', error);
      throw error;
    }
  }
  /**
   * Genera la URL de verificación para Notas de Venta
   * @param noteData Datos de la nota de venta
   * @returns URL de verificación de tu sistema
   */
  generateNoteQRUrl(noteData: {
    folio: string;
    fecha: string;
    rfcEmisor: string;
    total: number;
    clienteNombre?: string;
  }): string {
    try {
      // Generar hash único para verificación
      const verificationData = `${noteData.folio}|${noteData.fecha}|${noteData.rfcEmisor}|${noteData.total}`;
      const hash = Buffer.from(verificationData).toString('base64url');

      // URL de tu sistema (ajusta según tu dominio)
      const qrUrl = `https://tu-dominio.com/verificar/nota/${hash}`;

      // O si prefieres parámetros visibles:
      // const qrUrl = 
      //   `https://tu-dominio.com/verificar/nota?` +
      //   `folio=${noteData.folio}` +
      //   `&fecha=${noteData.fecha}` +
      //   `&rfc=${noteData.rfcEmisor}` +
      //   `&total=${noteData.total.toFixed(2)}`;

      this.logger.log(`📱 URL QR Nota generada: ${qrUrl}`);

      return qrUrl;
    } catch (error) {
      this.logger.error('❌ Error generando URL del QR para nota:', error);
      throw new Error(`Error generando URL del QR: ${error.message}`);
    }
  }

  /**
   * Genera QR completo para Nota de Venta
   * @param noteData Datos de la nota de venta
   * @returns Objeto con URL y imagen base64
   */
  async generateNoteQR(noteData: {
    folio: string;
    fecha: string;
    rfcEmisor: string;
    total: number;
    clienteNombre?: string;
  }): Promise<{ url: string; image: string }> {
    try {
      // 1. Generar URL
      const url = this.generateNoteQRUrl(noteData);

      // 2. Generar imagen (reutilizando el método existente)
      const image = await this.generateQRImage(url);

      this.logger.log('✅ QR de nota de venta generado correctamente');

      return { url, image };
    } catch (error) {
      this.logger.error('❌ Error en generateNoteQR:', error);
      throw error;
    }
  }

  /**
   * Genera QR con datos JSON embebidos (alternativa más detallada)
   * Útil si quieres que el QR contenga toda la información sin conexión
   */
  async generateNoteQRWithData(noteData: {
    folio: string;
    fecha: string;
    rfcEmisor: string;
    nombreEmisor: string;
    total: number;
    subtotal: number;
    impuestos: number;
    clienteNombre?: string;
    clienteRFC?: string;
  }): Promise<{ data: string; image: string }> {
    try {
      // Crear objeto JSON con los datos
      const qrData = JSON.stringify({
        tipo: 'NOTA_VENTA',
        folio: noteData.folio,
        fecha: noteData.fecha,
        emisor: {
          rfc: noteData.rfcEmisor,
          nombre: noteData.nombreEmisor
        },
        importes: {
          subtotal: noteData.subtotal,
          impuestos: noteData.impuestos,
          total: noteData.total
        },
        cliente: noteData.clienteNombre || 'PÚBLICO GENERAL',
        verificacion: `https://tu-dominio.com/verificar/nota/${noteData.folio}`
      });

      // Generar imagen
      const image = await this.generateQRImage(qrData);

      this.logger.log('✅ QR de nota con datos JSON generado');

      return { data: qrData, image };
    } catch (error) {
      this.logger.error('❌ Error en generateNoteQRWithData:', error);
      throw error;
    }
  }
}