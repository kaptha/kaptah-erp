import { Injectable } from '@nestjs/common';
import * as puppeteer from 'puppeteer';

@Injectable()
export class PdfService {
  async generatePdf(html: string): Promise<Buffer> {
    // Inicia una instancia de navegador headless
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
      // Crea una nueva página
      const page = await browser.newPage();
      
      // Establece el contenido HTML
      await page.setContent(html, {
        waitUntil: 'networkidle0', // Espera hasta que no haya conexiones de red por al menos 500ms
        timeout: 30000 // Aumenta el tiempo de espera a 30 segundos
      });
      
      // Genera el PDF
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' }
      });
      
      // Convertir el Uint8Array a Buffer
      return Buffer.from(pdfBuffer);
    } finally {
      // Asegúrate de cerrar el navegador incluso si hay un error
      await browser.close();
    }
  }
}