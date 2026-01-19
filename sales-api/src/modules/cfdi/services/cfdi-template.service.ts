import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cfdi } from '../entities/cfdi.entity';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class CfdiTemplateService {
  private readonly logger = new Logger(CfdiTemplateService.name);
  private readonly templatesPath: string; // ⭐ AGREGAR ESTA LÍNEA

  constructor() {
    // ⭐ INICIALIZAR EN EL CONSTRUCTOR
    this.templatesPath = path.join(process.cwd(), 'src', 'templates', 'cfdi');
    this.logger.log(`📁 Templates path: ${this.templatesPath}`);
  }

  /**
   * Genera HTML del CFDI con estilo personalizado
   */
  generateCfdiHTML(cfdi: Cfdi, qrImage: string, estilo: string = 'classic'): string {
    // Cargar plantilla HTML
    const templatePath = path.join(this.templatesPath, `cfdi-${estilo}.html`);
    
    this.logger.log(`📄 Cargando plantilla: ${templatePath}`);
    
    if (!fs.existsSync(templatePath)) {
      this.logger.error(`❌ Plantilla no encontrada: ${templatePath}`);
      throw new NotFoundException(`Template cfdi-${estilo}.html no encontrado en ${this.templatesPath}`);
    }
    
    const templateHtml = fs.readFileSync(templatePath, 'utf8');
    
    // Parsear datos del XML
    const xmlData = this.parseBasicXmlData(cfdi.xml);
    
    // Fecha actual para el footer
    const fechaGeneracion = new Date().toLocaleString('es-MX', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    // Reemplazar variables
    let html = templateHtml
      .replace(/\{\{uuid\}\}/g, cfdi.uuid)
      .replace(/\{\{qrImage\}\}/g, qrImage)
      .replace(/\{\{serie\}\}/g, xmlData.serie)
      .replace(/\{\{folio\}\}/g, xmlData.folio)
      .replace(/\{\{fecha\}\}/g, xmlData.fecha)
      .replace(/\{\{emisorNombre\}\}/g, xmlData.emisorNombre)
      .replace(/\{\{emisorRfc\}\}/g, xmlData.emisorRfc)
      .replace(/\{\{regimenFiscal\}\}/g, xmlData.regimenFiscal || 'N/A')
      .replace(/\{\{lugarExpedicion\}\}/g, xmlData.lugarExpedicion || 'N/A')
      .replace(/\{\{receptorNombre\}\}/g, xmlData.receptorNombre)
      .replace(/\{\{receptorRfc\}\}/g, xmlData.receptorRfc)
      .replace(/\{\{receptorDireccion\}\}/g, xmlData.receptorDireccion || 'N/A')
      .replace(/\{\{usoCfdi\}\}/g, xmlData.usoCfdi || 'N/A')
      .replace(/\{\{receptorRegimen\}\}/g, xmlData.receptorRegimen || 'N/A')
      .replace(/\{\{receptorCP\}\}/g, xmlData.receptorCP || 'N/A')
      .replace(/\{\{tipoCfdi\}\}/g, this.getTipoCfdiName(cfdi.tipo_cfdi))
      .replace(/\{\{formaPago\}\}/g, xmlData.formaPago || 'N/A')
      .replace(/\{\{metodoPago\}\}/g, xmlData.metodoPago || 'N/A')
      .replace(/\{\{moneda\}\}/g, xmlData.moneda || 'MXN')
      .replace(/\{\{exportacion\}\}/g, xmlData.exportacion || 'No aplica')
      .replace(/\{\{noCertificadoCSD\}\}/g, xmlData.noCertificadoCSD || 'N/A')
      .replace(/\{\{total\}\}/g, this.formatCurrency(cfdi.total))
      .replace(/\{\{subtotal\}\}/g, this.formatCurrency(cfdi.subtotal))
      .replace(/\{\{iva\}\}/g, this.formatCurrency(cfdi.total - cfdi.subtotal))
      .replace(/\{\{selloCFD\}\}/g, cfdi.selloCFD)
      .replace(/\{\{selloSAT\}\}/g, cfdi.selloSAT)
      .replace(/\{\{noCertificadoSAT\}\}/g, cfdi.noCertificadoSAT)
      .replace(/\{\{fechaTimbrado\}\}/g, this.formatDate(cfdi.fechaTimbrado))
      .replace(/\{\{estado\}\}/g, cfdi.status === 'vigente' ? 'VIGENTE' : 'CANCELADO')
      .replace(/\{\{cadenaOriginal\}\}/g, cfdi.cadenaOriginal || 'N/A')
      .replace(/\{\{fechaGeneracion\}\}/g, fechaGeneracion)
      .replace(/\{\{telefonoContacto\}\}/g, '(55) 1234-5678') // ⭐ Obtener de la empresa
      .replace(/\{\{emailContacto\}\}/g, 'contacto@empresa.com') // ⭐ Obtener de la empresa
      .replace(/\{\{logo\}\}/g, 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='); // ⭐ Placeholder por ahora
    
    // ⭐ TODO: Agregar tabla de conceptos (por ahora placeholder)
    html = html.replace(/\{\{conceptos\}\}/g, `
      <tr>
        <td>1</td>
        <td>Pieza</td>
        <td>Concepto de ejemplo</td>
        <td>${this.formatCurrency(cfdi.subtotal)}</td>
        <td>${this.formatCurrency(cfdi.total - cfdi.subtotal)}</td>
        <td>${this.formatCurrency(cfdi.total)}</td>
      </tr>
    `);
    
    return html;
  }

  /**
   * Parsea datos básicos del XML
   */
  private parseBasicXmlData(xml: string): any {
    try {
      // Serie
      const serieMatch = xml.match(/Serie="([^"]+)"/);
      const serie = serieMatch ? serieMatch[1] : 'N/A';

      // Folio
      const folioMatch = xml.match(/Folio="([^"]+)"/);
      const folio = folioMatch ? folioMatch[1] : 'N/A';

      // Fecha
      const fechaMatch = xml.match(/Fecha="([^"]+)"/);
      const fecha = fechaMatch ? fechaMatch[1] : 'N/A';

      // Emisor
      const emisorNombreMatch = xml.match(/Emisor[^>]+Nombre="([^"]+)"/);
      const emisorNombre = emisorNombreMatch ? emisorNombreMatch[1] : 'N/A';

      const emisorRfcMatch = xml.match(/Emisor[^>]+Rfc="([^"]+)"/);
      const emisorRfc = emisorRfcMatch ? emisorRfcMatch[1] : 'N/A';

      const regimenMatch = xml.match(/RegimenFiscal="([^"]+)"/);
      const regimenFiscal = regimenMatch ? regimenMatch[1] : 'N/A';

      const lugarMatch = xml.match(/LugarExpedicion="([^"]+)"/);
      const lugarExpedicion = lugarMatch ? lugarMatch[1] : 'N/A';

      // Receptor
      const receptorNombreMatch = xml.match(/Receptor[^>]+Nombre="([^"]+)"/);
      const receptorNombre = receptorNombreMatch ? receptorNombreMatch[1] : 'N/A';

      const receptorRfcMatch = xml.match(/Receptor[^>]+Rfc="([^"]+)"/);
      const receptorRfc = receptorRfcMatch ? receptorRfcMatch[1] : 'N/A';

      const receptorRegimenMatch = xml.match(/RegimenFiscalReceptor="([^"]+)"/);
      const receptorRegimen = receptorRegimenMatch ? receptorRegimenMatch[1] : 'N/A';

      const usoCfdiMatch = xml.match(/UsoCFDI="([^"]+)"/);
      const usoCfdi = usoCfdiMatch ? usoCfdiMatch[1] : 'N/A';

      const receptorCPMatch = xml.match(/DomicilioFiscalReceptor="([^"]+)"/);
      const receptorCP = receptorCPMatch ? receptorCPMatch[1] : 'N/A';

      // Pago
      const metodoPagoMatch = xml.match(/MetodoPago="([^"]+)"/);
      const metodoPago = metodoPagoMatch ? metodoPagoMatch[1] : 'N/A';

      const formaPagoMatch = xml.match(/FormaPago="([^"]+)"/);
      const formaPago = formaPagoMatch ? formaPagoMatch[1] : 'N/A';

      // Otros
      const monedaMatch = xml.match(/Moneda="([^"]+)"/);
      const moneda = monedaMatch ? monedaMatch[1] : 'MXN';

      const exportacionMatch = xml.match(/Exportacion="([^"]+)"/);
      const exportacion = exportacionMatch ? exportacionMatch[1] : '01';

      const noCertificadoCSDMatch = xml.match(/NoCertificado="([^"]+)"/);
      const noCertificadoCSD = noCertificadoCSDMatch ? noCertificadoCSDMatch[1] : 'N/A';

      return {
        serie,
        folio,
        fecha,
        emisorNombre,
        emisorRfc,
        regimenFiscal,
        lugarExpedicion,
        receptorNombre,
        receptorRfc,
        receptorRegimen,
        receptorCP,
        usoCfdi,
        metodoPago,
        formaPago,
        moneda,
        exportacion,
        noCertificadoCSD,
        receptorDireccion: 'N/A' // TODO: Extraer del XML si existe
      };
    } catch (error) {
      this.logger.error('Error parseando XML:', error);
      return {};
    }
  }

  /**
   * Formatea fecha
   */
  private formatDate(date: Date): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString('es-MX', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Formatea moneda
   */
  private formatCurrency(amount: number): string {
    if (!amount) return '0.00';
    return new Intl.NumberFormat('es-MX', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  }

  /**
   * Obtiene nombre del tipo de CFDI
   */
  private getTipoCfdiName(tipo: string): string {
    const tipos = {
      'I': 'Ingreso',
      'E': 'Egreso',
      'N': 'Nómina',
      'P': 'Pago',
      'T': 'Traslado'
    };
    return tipos[tipo] || tipo;
  }
}