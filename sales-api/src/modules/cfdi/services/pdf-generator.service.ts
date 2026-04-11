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
        width: 816,
        height: 1056,
        deviceScaleFactor: 2,
      });

      await page.setContent(html, {
        waitUntil: 'networkidle0',
      });

      const pdfBuffer = await page.pdf({
  format: 'Letter',
  printBackground: true,
  preferCSSPageSize: false,
  displayHeaderFooter: false,
  margin: {
    top: '5px',
    right: '5px',
    bottom: '5px',
    left: '5px',
  },
  scale: 0.95,
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