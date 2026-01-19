import { Controller, Post, Body, Res, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { PdfService } from './pdf.service';

@Controller('api/pdf')
export class PdfController {
  constructor(private readonly pdfService: PdfService) {}
  
  @Post('generate')
  async generatePdf(@Body() data: { html: string }, @Res() res: Response) {
    try {
      // Utiliza el servicio para generar el PDF
      const pdf = await this.pdfService.generatePdf(data.html);
      
      // Configura la respuesta
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=cotizacion.pdf');
      
      // Envía el PDF como respuesta
      res.status(HttpStatus.OK).send(pdf);
    } catch (error) {
      console.error('Error generando PDF:', error);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ 
        message: 'Error al generar PDF',
        error: error.message
      });
    }
  }
}