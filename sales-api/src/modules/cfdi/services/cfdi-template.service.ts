import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cfdi } from '../entities/cfdi.entity';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class CfdiTemplateService {
  private readonly logger = new Logger(CfdiTemplateService.name);
  private readonly templatesPath: string;

  constructor() {
    // El asset se copia a dist/src/templates (ver outDir en nest-cli.json),
    // pero el .js compilado vive en dist/src/modules/cfdi/services.
    // Se prueban varias rutas para que funcione en local y en el contenedor.
    const candidatos = [
      path.join(__dirname, '..', '..', '..', 'templates', 'cfdi'),
      path.join(__dirname, '..', '..', '..', '..', 'templates', 'cfdi'),
      path.join(process.cwd(), 'dist', 'src', 'templates', 'cfdi'),
      path.join(process.cwd(), 'src', 'templates', 'cfdi'),
    ];

    const encontrado = candidatos.find((p) => fs.existsSync(p));
    this.templatesPath = encontrado || candidatos[0];

    if (encontrado) {
      this.logger.log(`Templates path: ${this.templatesPath}`);
    } else {
      this.logger.error(
        `No se encontro el directorio de plantillas. Candidatos probados: ${candidatos.join(' | ')}`,
      );
    }
  }

  /**
   * Genera HTML del CFDI con estilo personalizado
   */
  generateCfdiHTML(cfdi: Cfdi, qrImage: string, estilo: string = 'classic', logoUrl?: string): string {
    const templatePath = path.join(this.templatesPath, `cfdi-${estilo}.html`);
    
    this.logger.log(`📄 Cargando plantilla: ${templatePath}`);
    
    if (!fs.existsSync(templatePath)) {
      this.logger.error(`❌ Plantilla no encontrada: ${templatePath}`);
      throw new NotFoundException(`Template cfdi-${estilo}.html no encontrado en ${this.templatesPath}`);
    }
    
    const templateHtml = fs.readFileSync(templatePath, 'utf8');
    
    // Parsear datos del XML
    const xmlData = this.parseBasicXmlData(cfdi.xml);
    
    // Parsear conceptos del XML
    const conceptos = this.parseConceptos(cfdi.xml);
    
    // Generar HTML de conceptos
    const conceptosHtml = this.generateConceptosHtml(conceptos);
    
    // Fecha actual para el footer
    const fechaGeneracion = new Date().toLocaleString('es-MX', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });

    // Logo: usar el proporcionado o placeholder transparente
    const logo = logoUrl || 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    
    // Reemplazar variables
    let html = templateHtml
      .replace(/\{\{uuid\}\}/g, cfdi.uuid || 'N/A')
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
      .replace(/\{\{exportacion\}\}/g, xmlData.exportacion || '01')
      .replace(/\{\{noCertificadoCSD\}\}/g, xmlData.noCertificadoCSD || 'N/A')
      .replace(/\{\{total\}\}/g, this.formatCurrency(cfdi.total))
      .replace(/\{\{subtotal\}\}/g, this.formatCurrency(cfdi.subtotal))
      .replace(/\{\{iva\}\}/g, this.formatCurrency(cfdi.total - cfdi.subtotal))
      .replace(/\{\{selloCFD\}\}/g, cfdi.selloCFD || 'N/A')
      .replace(/\{\{selloSAT\}\}/g, cfdi.selloSAT || 'N/A')
      .replace(/\{\{noCertificadoSAT\}\}/g, cfdi.noCertificadoSAT || 'N/A')
      .replace(/\{\{fechaTimbrado\}\}/g, this.formatDate(cfdi.fechaTimbrado))
      .replace(/\{\{estado\}\}/g, cfdi.status === 'vigente' ? 'VIGENTE' : 'CANCELADO')
      .replace(/\{\{cadenaOriginal\}\}/g, cfdi.cadenaOriginal || 'N/A')
      .replace(/\{\{fechaGeneracion\}\}/g, fechaGeneracion)
      .replace(/\{\{telefonoContacto\}\}/g, xmlData.telefonoContacto || '')
      .replace(/\{\{emailContacto\}\}/g, xmlData.emailContacto || '')
      .replace(/\{\{logo\}\}/g, logo)
      .replace(/\{\{conceptos\}\}/g, conceptosHtml);
    
    return html;
  }

  /**
   * Parsea los conceptos del XML del CFDI
   */
  private parseConceptos(xml: string): any[] {
    const conceptos: any[] = [];
    
    try {
      // Buscar todos los bloques <cfdi:Concepto ... /> o <cfdi:Concepto ...>...</cfdi:Concepto>
      const conceptoRegex = /<cfdi:Concepto\s([^>]*?)(?:\/>|>([\s\S]*?)<\/cfdi:Concepto>)/gi;
      let match: RegExpExecArray | null;
      
      while ((match = conceptoRegex.exec(xml)) !== null) {
        const attrs = match[1];
        const innerContent = match[2] || '';
        
        // Extraer atributos del concepto
        const cantidad = this.getXmlAttr(attrs, 'Cantidad') || '1';
        const unidad = this.getXmlAttr(attrs, 'ClaveUnidad') || 'PZA';
        const unidadDesc = this.getXmlAttr(attrs, 'Unidad') || this.getUnidadName(unidad);
        const descripcion = this.getXmlAttr(attrs, 'Descripcion') || 'Sin descripción';
        const valorUnitario = this.getXmlAttr(attrs, 'ValorUnitario') || '0';
        const importe = this.getXmlAttr(attrs, 'Importe') || '0';
        
        // Buscar impuestos trasladados dentro del concepto
        let impuestoTotal = 0;
        const trasladoRegex = /<cfdi:Traslado\s([^>]*?)\/>/gi;
        let trasladoMatch: RegExpExecArray | null;
        
        while ((trasladoMatch = trasladoRegex.exec(innerContent)) !== null) {
          const importeImpuesto = this.getXmlAttr(trasladoMatch[1], 'Importe');
          if (importeImpuesto) {
            impuestoTotal += parseFloat(importeImpuesto);
          }
        }
        
        // Si no encontramos impuestos dentro del concepto, calcular con tasa 16%
        if (impuestoTotal === 0) {
          impuestoTotal = parseFloat(importe) * 0.16;
        }
        
        const total = parseFloat(importe) + impuestoTotal;
        
        conceptos.push({
          cantidad: parseFloat(cantidad),
          unidad: unidadDesc,
          descripcion,
          valorUnitario: parseFloat(valorUnitario),
          impuesto: impuestoTotal,
          total
        });
      }
      
      // Si no se encontraron conceptos con el namespace cfdi:, intentar sin namespace
      if (conceptos.length === 0) {
        const conceptoRegexSimple = /<Concepto\s([^>]*?)(?:\/>|>([\s\S]*?)<\/Concepto>)/gi;
        
        while ((match = conceptoRegexSimple.exec(xml)) !== null) {
          const attrs = match[1];
          const innerContent = match[2] || '';
          
          const cantidad = this.getXmlAttr(attrs, 'Cantidad') || '1';
          const unidad = this.getXmlAttr(attrs, 'ClaveUnidad') || 'PZA';
          const unidadDesc = this.getXmlAttr(attrs, 'Unidad') || this.getUnidadName(unidad);
          const descripcion = this.getXmlAttr(attrs, 'Descripcion') || 'Sin descripción';
          const valorUnitario = this.getXmlAttr(attrs, 'ValorUnitario') || '0';
          const importe = this.getXmlAttr(attrs, 'Importe') || '0';
          
          let impuestoTotal = 0;
          const trasladoRegex2 = /<Traslado\s([^>]*?)\/>/gi;
          let trasladoMatch2: RegExpExecArray | null;
          
          while ((trasladoMatch2 = trasladoRegex2.exec(innerContent)) !== null) {
            const importeImpuesto = this.getXmlAttr(trasladoMatch2[1], 'Importe');
            if (importeImpuesto) {
              impuestoTotal += parseFloat(importeImpuesto);
            }
          }
          
          if (impuestoTotal === 0) {
            impuestoTotal = parseFloat(importe) * 0.16;
          }
          
          const total = parseFloat(importe) + impuestoTotal;
          
          conceptos.push({
            cantidad: parseFloat(cantidad),
            unidad: unidadDesc,
            descripcion,
            valorUnitario: parseFloat(valorUnitario),
            impuesto: impuestoTotal,
            total
          });
        }
      }
      
      this.logger.log(`📦 Conceptos parseados del XML: ${conceptos.length}`);
    } catch (error) {
      this.logger.error('Error parseando conceptos del XML:', error);
    }
    
    // Si no se encontró nada, devolver un concepto genérico
    if (conceptos.length === 0) {
      this.logger.warn('⚠️ No se encontraron conceptos en el XML, usando fallback');
      conceptos.push({
        cantidad: 1,
        unidad: 'Servicio',
        descripcion: 'Concepto general',
        valorUnitario: 0,
        impuesto: 0,
        total: 0
      });
    }
    
    return conceptos;
  }

  /**
   * Genera el HTML de las filas de conceptos con clases CSS estandarizadas
   */
  private generateConceptosHtml(conceptos: any[]): string {
    return conceptos.map(c => `
      <tr>
        <td class="td-cant">${c.cantidad}</td>
        <td class="td-unidad">${c.unidad}</td>
        <td class="td-desc">${c.descripcion}</td>
        <td class="td-precio">$${this.formatCurrency(c.valorUnitario)}</td>
        <td class="td-impuesto">$${this.formatCurrency(c.impuesto)}</td>
        <td class="td-total">$${this.formatCurrency(c.total)}</td>
      </tr>
    `).join('');
  }

  /**
   * Extrae un atributo de un string de atributos XML
   */
  private getXmlAttr(attrsString: string, attrName: string): string | null {
    const regex = new RegExp(`${attrName}="([^"]*)"`, 'i');
    const match = attrsString.match(regex);
    return match ? match[1] : null;
  }

  /**
   * Obtiene nombre legible de la unidad por clave SAT
   */
  private getUnidadName(clave: string): string {
    const unidades: Record<string, string> = {
      'H87': 'Pieza',
      'E48': 'Servicio',
      'ACT': 'Actividad',
      'KGM': 'Kilogramo',
      'LTR': 'Litro',
      'MTR': 'Metro',
      'XBX': 'Caja',
      'XPK': 'Paquete',
      'XKI': 'Kit',
      'SET': 'Conjunto',
      'HUR': 'Hora',
      'DAY': 'Día',
      'MON': 'Mes',
      'ANN': 'Año',
      'XUN': 'Unidad',
      'GRM': 'Gramo',
      'TNE': 'Tonelada',
      'MLT': 'Mililitro',
      'MTK': 'Metro cuadrado',
      'MTQ': 'Metro cúbico',
    };
    return unidades[clave] || clave;
  }

  /**
   * Parsea datos básicos del XML
   */
  private parseBasicXmlData(xml: string): any {
    try {
      const serieMatch = xml.match(/Serie="([^"]+)"/);
      const serie = serieMatch ? serieMatch[1] : 'N/A';

      const folioMatch = xml.match(/Folio="([^"]+)"/);
      const folio = folioMatch ? folioMatch[1] : 'N/A';

      const fechaMatch = xml.match(/Fecha="([^"]+)"/);
      const fecha = fechaMatch ? fechaMatch[1] : 'N/A';

      const emisorNombreMatch = xml.match(/Emisor[^>]+Nombre="([^"]+)"/);
      const emisorNombre = emisorNombreMatch ? emisorNombreMatch[1] : 'N/A';

      const emisorRfcMatch = xml.match(/Emisor[^>]+Rfc="([^"]+)"/);
      const emisorRfc = emisorRfcMatch ? emisorRfcMatch[1] : 'N/A';

      const regimenMatch = xml.match(/RegimenFiscal="([^"]+)"/);
      const regimenFiscal = regimenMatch ? regimenMatch[1] : 'N/A';

      const lugarMatch = xml.match(/LugarExpedicion="([^"]+)"/);
      const lugarExpedicion = lugarMatch ? lugarMatch[1] : 'N/A';

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

      const metodoPagoMatch = xml.match(/MetodoPago="([^"]+)"/);
      const metodoPago = metodoPagoMatch ? metodoPagoMatch[1] : 'N/A';

      const formaPagoMatch = xml.match(/FormaPago="([^"]+)"/);
      const formaPago = formaPagoMatch ? formaPagoMatch[1] : 'N/A';

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
        receptorDireccion: 'N/A',
        telefonoContacto: '',
        emailContacto: ''
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
    if (!amount && amount !== 0) return '0.00';
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
