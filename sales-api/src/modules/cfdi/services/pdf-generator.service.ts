import { Injectable, Logger } from '@nestjs/common';
import * as puppeteer from 'puppeteer';

@Injectable()
export class PdfGeneratorService {
  private readonly logger = new Logger(PdfGeneratorService.name);

  async generatePDF(html: string): Promise<Buffer> {
    this.logger.log('🎨 Iniciando generación de PDF con Puppeteer...');

    let browser;
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu'
        ]
      });

      const page = await browser.newPage();

      // ⭐ Configurar el tamaño de la página antes de cargar contenido
      await page.setViewport({
        width: 1280,
        height: 1024,
        deviceScaleFactor: 2
      });

      await page.setContent(html, {
        waitUntil: 'networkidle0'
      });

      // ⭐ CONFIGURACIÓN MEJORADA DEL PDF
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        preferCSSPageSize: false, // ⭐ Usar el tamaño A4 forzado
        displayHeaderFooter: false,
        margin: {
          top: '5mm',    // ⭐ Reducir márgenes
          right: '5mm',
          bottom: '5mm',
          left: '5mm'
        },
        // ⭐ CRÍTICO: Intentar que todo quepa en una página
        scale: 0.70 // ⭐ Escalar ligeramente para que quepa mejor
      });

      this.logger.log('✅ PDF generado correctamente');

      return Buffer.from(pdfBuffer);
    } catch (error) {
      this.logger.error('❌ Error generando PDF:', error);
      throw new Error(`Error generando PDF: ${error.message}`);
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
}