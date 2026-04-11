import { Injectable, Logger } from '@nestjs/common';
import * as puppeteer from 'puppeteer';

@Injectable()
export class PdfGeneratorService {
  private readonly logger = new Logger(PdfGeneratorService.name);

  async generatePDF(html: string): Promise<Buffer> {
    this.logger.log('Iniciando generacion de PDF con Puppeteer...');
    let browser;
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
        ],
      });

      const page = await browser.newPage();

      await page.setViewport({
        width: 816,    // 8.5 pulgadas * 96 DPI = 816px (Letter width exacto)
        height: 1056,  // 11 pulgadas * 96 DPI = 1056px (Letter height exacto)
        deviceScaleFactor: 2,
      });

      // Inyectar CSS base ANTES del contenido del template
      const cssReset = `
        <style>
          @page {
            size: Letter;
            margin: 0;
          }
          html, body {
            width: 816px;
            margin: 0;
            padding: 0;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          /* Forzar que .container (usado en todos los templates) quepa en 1 pagina */
          .container {
            width: 100% !important;
            max-width: 780px !important;
            margin: 0 auto !important;
            padding: 15px 18px !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
          }
          /* Evitar que tablas se desborden */
          table {
            width: 100% !important;
            table-layout: fixed !important;
            word-wrap: break-word !important;
          }
          /* Logos no deben ser gigantes */
          img {
            max-height: 80px !important;
            object-fit: contain !important;
          }
        </style>
      `;

      // Insertar el CSS reset justo después del <head> o al inicio
      const modifiedHtml = html.includes('<head>')
        ? html.replace('<head>', `<head>${cssReset}`)
        : `${cssReset}${html}`;

      await page.setContent(modifiedHtml, {
        waitUntil: 'networkidle0',
      });

      const pdfBuffer = await page.pdf({
        format: 'Letter',
        printBackground: true,
        preferCSSPageSize: false,   // Puppeteer controla el tamaño, no el CSS del template
        displayHeaderFooter: false,
        margin: {
          top: '10px',
          right: '10px',
          bottom: '10px',
          left: '10px',
        },
        scale: 1,
      });

      this.logger.log('PDF generado correctamente');
      return Buffer.from(pdfBuffer);
    } catch (error) {
      this.logger.error('Error generando PDF:', error);
      throw new Error(`Error generando PDF: ${error.message}`);
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
}