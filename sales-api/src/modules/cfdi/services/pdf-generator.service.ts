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
        format: 'Letter',         // Cambiado de A4 a Letter (8.5" x 11")
        printBackground: true,
        preferCSSPageSize: true,  // Permitimos que el CSS controle el layout
        displayHeaderFooter: false,
        margin: {
          top: '0px',             // Quitamos márgenes de Puppeteer porque 
          right: '0px',           // el template ya tiene sus propios paddings
          bottom: '0px',
          left: '0px'
        },
        scale: 1                  // Aumentado de 0.70 a 1 para tamaño real
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