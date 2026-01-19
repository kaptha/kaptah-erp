import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError, forkJoin } from 'rxjs';
import { map, catchError, switchMap, tap } from 'rxjs/operators';
import { DocumentType } from '../shared/enums/document-type.enum';
import { DesignSettingsService } from './design-settings.service';
import { LogoService } from './logo.service';
import html2pdf from 'html2pdf.js'; // AÑADIR ESTA IMPORTACIÓN

@Injectable({
  providedIn: 'root'
})
export class DocumentGeneratorService {
  // Configuración de html2pdf optimizada
  private pdfOptions = {
    margin: [5, 5, 5, 5], // mm
    filename: 'documento.pdf',
    image: { 
      type: 'jpeg', 
      quality: 0.98 
    },
    html2canvas: { 
      scale: 2,
      useCORS: true,
      letterRendering: true,
      allowTaint: false,
      backgroundColor: '#ffffff',
      logging: false,
      width: 794,  // A4 width en pixels a 96 DPI
      height: 1123, // A4 height en pixels a 96 DPI
      scrollX: 0,
      scrollY: 0,
      onrendered: function(canvas: any) {
        console.log('Canvas renderizado exitosamente');
      }
    },
    jsPDF: { 
      unit: 'mm', 
      format: 'a4', 
      orientation: 'portrait',
      compress: true
    },
    pagebreak: { 
      mode: ['avoid-all', 'css', 'legacy'],
      before: '.page-break-before',
      after: '.page-break-after'
    }
  };

  //  rutas HTML 
  private designPaths: { [key: string]: string } = {
    // Facturas
    'classic-invoice': '/assets/images/designs/invoices/classic-invoice.html',
    'modern-invoice': '/assets/images/designs/invoices/modern-invoice.html',
    'minimal-invoice': '/assets/images/designs/invoices/minimal-invoice.html',
    'professional-invoice': '/assets/images/designs/invoices/professional-invoice.html',
    'creative-invoice': '/assets/images/designs/invoices/creative-invoice.html',
    
    // Notas de remisión
    'classic-delivery': '/assets/images/designs/delivery-notes/classic-delivery.html',
    'modern-delivery': '/assets/images/designs/delivery-notes/modern-delivery.html',
    'minimal-delivery': '/assets/images/designs/delivery-notes/minimal-delivery.html',
    'professional-delivery': '/assets/images/designs/delivery-notes/professional-delivery.html',
    'creative-delivery': '/assets/images/designs/delivery-notes/creative-delivery.html',
    
    // Cotizaciones
    'classic-quote': '/assets/images/designs/quotes/classic-quote.html',
    'modern-quote': '/assets/images/designs/quotes/modern-quote.html',
    'minimal-quote': '/assets/images/designs/quotes/minimal-quote.html',
    'professional-quote': '/assets/images/designs/quotes/professional-quote.html',
    'creative-quote': '/assets/images/designs/quotes/creative-quote.html'
  };

  // Rutas a los CSS específicos
  private cssDesignPaths: { [key: string]: string } = {
    // CSS para facturas
    'classic-invoice': '/assets/styles/pdf/invoices/classic-invoice.css',
    'modern-invoice': '/assets/styles/pdf/invoices/modern-invoice.css',
    'minimal-invoice': '/assets/styles/pdf/invoices/minimal-invoice.css',
    'professional-invoice': '/assets/styles/pdf/invoices/professional-invoice.css',
    'creative-invoice': '/assets/styles/pdf/invoices/creative-invoice.css',
    
    // CSS para notas de remisión
    'classic-delivery': '/assets/styles/pdf/delivery-notes/classic-delivery.css',
    'modern-delivery': '/assets/styles/pdf/delivery-notes/modern-delivery.css',
    'minimal-delivery': '/assets/styles/pdf/delivery-notes/minimal-delivery.css',
    'professional-delivery': '/assets/styles/pdf/delivery-notes/professional-delivery.css',
    'creative-delivery': '/assets/styles/pdf/delivery-notes/creative-delivery.css',
    
    // CSS para cotizaciones
    'classic-quote': '/assets/styles/pdf/quotes/classic-quote.css',
    'modern-quote': '/assets/styles/pdf/quotes/modern-quote.css',
    'minimal-quote': '/assets/styles/pdf/quotes/minimal-quote.css',
    'professional-quote': '/assets/styles/pdf/quotes/professional-quote.css',
    'creative-quote': '/assets/styles/pdf/quotes/creative-quote.css'
  };

  // Para almacenar en caché el logo
  private logoCache: {url: string, fallbackUsed: boolean} | null = null;

  constructor(
    private http: HttpClient,
    private designSettings: DesignSettingsService,
    private logoService: LogoService
  ) { }

  // NUEVO MÉTODO PRINCIPAL PARA GENERAR PDF DIRECTAMENTE
  /**
   * Método principal para generar PDF que reemplaza el flujo anterior
   */
  async generatePdfFromPreview(data: any, designName: string, documentType: DocumentType): Promise<void> {
    console.log('🚀 Iniciando generación de PDF con diseño:', designName);
    
    try {
      const finalHtml = await this.generateDocument(documentType, { ...data, designType: designName }).toPromise();

if (!finalHtml) {
  throw new Error('No se pudo generar el HTML del documento');
}

await this.convertHtmlToPdf(finalHtml, data, documentType);
    } catch (error) {
      console.error('❌ Error generando documento:', error);
      alert('Error al generar el documento. Por favor intente nuevamente.');
    }
  }

  // MÉTODO MEJORADO PARA CONVERSIÓN A PDF
  /**
   * Convierte el HTML final a PDF usando html2pdf
   */
  private async convertHtmlToPdf(htmlContent: string, data: any, documentType: DocumentType): Promise<void> {
  console.log('🔄 Iniciando conversión HTML a PDF...');

  try {
    const html2pdfModule = await import('html2pdf.js');
    const html2pdf = html2pdfModule.default;

    // Crear contenedor temporal oculto
    const tempContainer = document.createElement('div');
    tempContainer.innerHTML = htmlContent;
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    tempContainer.style.top = '-9999px';
    tempContainer.style.width = '794px'; // A4 width
    tempContainer.style.height = 'auto';
    tempContainer.style.overflow = 'visible';

    // Agregar al DOM
    document.body.appendChild(tempContainer);

    // Esperar a que el logo cargue si existe
    const logoImg = tempContainer.querySelector('.logo-img') as HTMLImageElement;
    if (logoImg && logoImg.complete === false) {
      await new Promise(resolve => {
        logoImg.onload = resolve;
        logoImg.onerror = resolve;
      });
    }

    // Esperar un poco para que los estilos se apliquen completamente
    await new Promise(resolve => setTimeout(resolve, 300));

    const filename = this.generateFilename(data, documentType);
    const options = { 
      ...this.pdfOptions,
      filename
    };

    console.log('📋 Configuración PDF:', options);

    // Generar y guardar el PDF
    await html2pdf()
      .set(options)
      .from(tempContainer)
      .save();

    console.log('✅ PDF generado y descargado exitosamente');
  } catch (error) {
    console.error('❌ Error en conversión HTML a PDF:', error);
    alert('Error al generar el PDF. Por favor intente nuevamente.');
  } finally {
    // Limpiar contenedor
    const tempContainers = document.querySelectorAll('div[style*="-9999px"]');
    tempContainers.forEach(container => {
      if (container.parentNode) {
        container.parentNode.removeChild(container);
      }
    });
  }
}


  // MÉTODO PARA GENERAR NOMBRE DE ARCHIVO
  private generateFilename(data: any, documentType: DocumentType): string {
    const note = data.note || {};
    const number = note.id ? note.id.slice(0, 8) : 'documento';
    
    let prefix = '';
    switch (documentType) {
      case DocumentType.INVOICE:
        prefix = 'factura';
        break;
      case DocumentType.DELIVERY_NOTE:
        prefix = 'orden-venta';
        break;
      case DocumentType.QUOTE:
        prefix = 'cotizacion';
        break;
      default:
        prefix = 'documento';
    }
    
    return `${prefix}-${number}.pdf`;
  }

  /**
   * Genera el HTML para un documento según su tipo y datos
   * VERSIÓN MEJORADA con mejor manejo de CSS
   */
  generateDocument(documentType: DocumentType, data: any): Observable<string> {
    console.log('🎨 Iniciando generación de documento con CSS integrado');
    
    // Obtener logo primero y luego generar el documento
    return this.getLogoUrl().pipe(
      tap(logoResult => {
        // Añadir el URL del logo a los datos
        data.logoUrl = logoResult.url;
        data.logoFallbackUsed = logoResult.fallbackUsed;
        console.log('📷 Logo obtenido:', logoResult.url);
      }),
      switchMap(() => this.determineDesign(documentType, data)),
      tap(designType => console.log('🎯 Diseño determinado:', designType)),
      map(designType => {
        // Verificar si el diseño existe
        if (!this.designPaths[designType]) {
          console.warn(`⚠️ El diseño ${designType} no existe. Usando diseño por defecto.`);
          designType = this.getDefaultDesign(documentType);
        }
        return designType;
      }),
      // Cargar HTML y CSS en paralelo
      switchMap(designType => {
        data.currentDesignType = designType;
        console.log('📂 Cargando recursos para:', designType);
        
        return forkJoin({
          template: this.getTemplateHtml(designType),
          baseCss: this.loadCSS('/assets/styles/pdf/base-pdf.css'),
          designCss: this.loadDesignCSS(designType)
        });
      }),
      // PROCESAMIENTO MEJORADO CON CSS EMBEBIDO
      map(({ template, baseCss, designCss }) => {
        console.log('🔧 Procesando plantilla y aplicando estilos inline');
        
        // Procesar la plantilla con los datos
        let processedHtml = this.processTemplateWithData(template, data, data.currentDesignType);
        
        // CREAR HTML COMPLETO CON ESTILOS EMBEBIDOS CORRECTAMENTE
        const finalHtml = this.buildCompleteHtmlDocument(processedHtml, baseCss, designCss, data);
        
        console.log('✅ Documento generado exitosamente con estilos inline');
        return finalHtml;
      }),
      catchError(error => {
        console.error('❌ Error al generar documento:', error);
        return throwError(() => new Error('Error al generar documento. Por favor intente nuevamente.'));
      })
    );
  }

  // MÉTODO MEJORADO PARA CONSTRUIR HTML COMPLETO
  /**
   * Construye el documento HTML completo con todos los estilos embebidos
   */
  /**
 * Construye el documento HTML completo con todos los estilos embebidos - VERSIÓN DEBUG
 */
private buildCompleteHtmlDocument(processedHtml: string, baseCss: string, designCss: string, data: any): string {
  
  // ✅ AÑADIR LOGS DE DEBUG PARA CSS
  console.log('🔍 === DEBUG CSS ===');
  console.log('📄 Base CSS cargado:', baseCss ? 'SÍ' : 'NO');
  console.log('📄 Base CSS tamaño:', baseCss.length, 'caracteres');
  console.log('🎨 Design CSS cargado:', designCss ? 'SÍ' : 'NO'); 
  console.log('🎨 Design CSS tamaño:', designCss.length, 'caracteres');
  console.log('🔍 Design CSS contiene "container"?', designCss.includes('.container'));
  console.log('🔍 Design CSS contiene "classic-delivery"?', designCss.includes('classic-delivery'));
  
  // Combinar y optimizar CSS
  const optimizedCss = this.optimizeCssForPdf(baseCss, designCss);
  
  console.log('⚙️ CSS optimizado tamaño:', optimizedCss.length, 'caracteres');
  console.log('🔍 ==================');
  
  // Crear documento HTML completo con CSS FORZADO
  const completeHtml = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="format-detection" content="telephone=no">
    <title>Documento PDF - ${data.note?.id || 'Sin número'}</title>
    <style>
        /* ===== RESET CRÍTICO ===== */
        * {
          margin: 0 !important;
          padding: 0 !important;
          box-sizing: border-box !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        
        /* ===== CSS BASE FORZADO ===== */
        body {
          font-family: Arial, sans-serif !important;
          font-size: 12px !important;
          line-height: 1.4 !important;
          color: #000 !important;
          background: white !important;
          margin: 0 !important;
          padding: 0 !important;
        }
        
        /* ===== CONTENEDOR PRINCIPAL ===== */
        .container {
          width: 100% !important;
          max-width: 190mm !important;
          margin: 0 auto !important;
          border: 2px solid #000 !important;
          border-radius: 25px !important;
          padding: 15mm !important;
          background: white !important;
          box-sizing: border-box !important;
        }
        
        /* ===== HEADER ===== */
        .header {
          display: flex !important;
          justify-content: space-between !important;
          align-items: flex-start !important;
          margin-bottom: 20px !important;
        }
        
        .header-left {
          width: 140px !important;
        }
        
        .logo-container {
          width: 130px !important;
          height: 130px !important;
          background-color: #f5f5f5 !important;
          border-radius: 10px !important;
          display: flex !important;
          flex-direction: column !important;
          justify-content: center !important;
          align-items: center !important;
          padding: 8px !important;
        }
        
        .header-right {
          flex: 1 !important;
          padding-left: 15px !important;
          position: relative !important;
        }
        
        .remission-title {
          font-size: 18px !important;
          font-weight: bold !important;
          text-align: center !important;
          margin-bottom: 8px !important;
          color: #000 !important;
        }
        
        /* ===== INFORMACIÓN DEL CLIENTE - CORREGIR BORDES ===== */
        .client-info {
          margin: 15px 0 !important;
          clear: both !important;
        }
        
        .client-field {
          display: flex !important;
          align-items: center !important;
          margin-bottom: 8px !important;
        }
        
        .client-label {
          width: 80px !important;
          font-weight: bold !important;
          font-size: 12px !important;
          color: #000 !important;
        }
        
        .client-value {
          flex: 1 !important;
          border: none !important;  /* ✅ QUITAR BORDE NEGRO */
          border-bottom: 1px solid #000 !important;  /* ✅ SOLO LÍNEA INFERIOR */
          padding: 2px 8px !important;
          font-size: 11px !important;
          background: transparent !important;
          min-height: 14px !important;
        }
        
        /* ===== TABLA DE PRODUCTOS - CORREGIR BORDES ===== */
        .products-table {
          width: 100% !important;
          border-collapse: collapse !important;
          margin: 15px 0 !important;
        }
        
        .products-table th,
        .products-table td {
          border: 1px solid #000 !important;  /* ✅ BORDE FINO */
          padding: 6px !important;
          font-size: 11px !important;
          text-align: center !important;
        }
        
        .products-table th {
          background-color: #f8f9fa !important;
          font-weight: bold !important;
        }
        
        .products-table td:nth-child(2) {
          text-align: left !important;
        }
        
        .products-table td:nth-child(3),
        .products-table td:nth-child(4) {
          text-align: right !important;
        }
        
        /* ===== OBSERVACIONES ===== */
        .observations-section {
          margin-bottom: 15px !important;
        }
        
        .observations-title {
          font-weight: bold !important;
          font-size: 12px !important;
          margin-bottom: 4px !important;
          color: #000 !important;
        }
        
        .observations-box {
          border: 1px solid #000 !important;
          padding: 8px !important;
          min-height: 50px !important;
          font-size: 11px !important;
          background: white !important;
        }
        
        /* ===== TOTALES Y FIRMA ===== */
        .totals-signature {
          display: flex !important;
          justify-content: space-between !important;
          align-items: flex-start !important;
        }
        
        .totals-container {
          display: flex !important;
          flex-direction: column !important;
          gap: 5px !important;
        }
        
        .total-row {
          display: flex !important;
          align-items: center !important;
          gap: 8px !important;
        }
        
        .total-label {
          font-weight: bold !important;
          font-size: 11px !important;
          min-width: 80px !important;
          text-align: right !important;
          color: #000 !important;
        }
        
        .total-value {
          border: 1px solid #000 !important;
          padding: 4px 6px !important;
          width: 80px !important;
          text-align: right !important;
          font-size: 11px !important;
          background: white !important;
        }
        
        .signature-container {
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          margin-left: 20px !important;
        }
        
        .signature-line {
          border-top: 1px solid #000 !important;
          width: 150px !important;
          margin-bottom: 4px !important;
        }
        
        .signature-text {
          font-weight: bold !important;
          font-size: 10px !important;
          color: #000 !important;
        }
        
        /* ===== CSS ORIGINAL DEL DISEÑO (si existe) ===== */
        ${designCss}
        
        /* ===== CSS BASE (si existe) ===== */
        ${baseCss}
        
    </style>
</head>
<body>
    ${processedHtml}
</body>
</html>`;

  console.log('📋 HTML completo construido, tamaño total:', completeHtml.length, 'caracteres');
  return completeHtml;
}

  // MÉTODO PARA OPTIMIZAR CSS PARA PDF
  /**
   * Optimiza y combina CSS específicamente para html2pdf
   */
  private optimizeCssForPdf(baseCss: string, designCss: string): string {
    const pdfOptimizations = `
      /* Optimizaciones específicas para html2pdf */
      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }
      
      body {
        font-family: Arial, sans-serif !important;
        margin: 0 !important;
        padding: 0 !important;
        background: white !important;
      }
      
      /* Forzar renderizado de elementos visuales */
      .container,
      .products-table,
      .products-table th,
      .products-table td,
      .client-value,
      .total-value,
      .observations-box,
      .date-container,
      .signature-line,
      .logo-container {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }
      
      /* Evitar problemas de salto de página */
      .container {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      
      /* Asegurar que flexbox funcione en PDF */
      .header,
      .totals-signature,
      .contact-info,
      .date-container {
        display: flex !important;
      }
      
      /* Forzar bordes visibles */
      table, th, td, 
      .container,
      .client-value,
      .total-value,
      .observations-box {
        border-color: #000 !important;
        border-style: solid !important;
      }
    `;
    
    return `
      /* CSS Base */
      ${baseCss}
      
      /* CSS del Diseño */
      ${designCss}
      
      /* Optimizaciones para PDF */
      ${pdfOptimizations}
    `;
  }

  // RESTO DE MÉTODOS EXISTENTES (sin cambios significativos)
  /**
   * Procesa la plantilla profesional específicamente
   */
  private processProfessionalTemplate(html: string, data: any): string {
    console.log('🏢 Procesando plantilla profesional');
    const note = data.note || {};
    let items = note.items || [];
    
    // Si items es un string, parsearlo
    if (typeof items === 'string') {
      try {
        items = JSON.parse(items);
      } catch (e) {
        console.error('Error al parsear items:', e);
        items = [];
      }
    }
    
    console.log('📦 Items a procesar:', items);
    
    // Generar exactamente 8 filas de productos
    let itemsHtml = '';
    const maxItems = 8;
    
    for (let i = 0; i < maxItems; i++) {
      if (i < items.length) {
        const item = items[i];
        const quantity = item.quantity || item.cantidad || 1;
        const description = item.description || item.descripcion || '';
        const unitPrice = item.unitPrice || item.precio || item.precioUnitario || 0;
        const total = item.total || item.subtotal || (quantity * unitPrice);
        
        itemsHtml += `
          <tr>
            <td>${quantity}</td>
            <td>${description}</td>
            <td>${this.formatCurrency(unitPrice)}</td>
            <td>${this.formatCurrency(total)}</td>
          </tr>
        `;
      } else {
        itemsHtml += `
          <tr>
            <td>&nbsp;</td>
            <td></td>
            <td></td>
            <td></td>
          </tr>
        `;
      }
    }
    
    console.log('📝 HTML de items generado');
    
    // Reemplazar placeholder de productos
    let processedHtml = html.replace('[[FILAS_PRODUCTOS]]', itemsHtml);
    
    // Mapear datos específicos para profesional
    const mappedData = this.mapDataForDocument(data, DocumentType.DELIVERY_NOTE);
    
    // Añadir datos específicos de fecha
    const currentDate = note.saleDate || note.createdAt || new Date();
    const dateComponents = this.getDateParts(currentDate);
    
    mappedData['DIA'] = dateComponents.dia;
    mappedData['MES'] = dateComponents.mes;
    mappedData['AÑO'] = dateComponents.anio;
    
    console.log('📊 Datos mapeados:', Object.keys(mappedData));
    
    // Reemplazar todos los placeholders
    Object.keys(mappedData).forEach(key => {
      const placeholder = `[[${key}]]`;
      const value = mappedData[key] !== undefined ? mappedData[key] : '';
      
      while (processedHtml.includes(placeholder)) {
        processedHtml = processedHtml.replace(placeholder, value);
      }
    });
    
    console.log('✅ Plantilla profesional procesada');
    return processedHtml;
  }

  /**
   * Procesa las filas de productos/servicios para órdenes de venta
   */
  private processOrderItems(html: string, data: any): string {
    console.log('🔄 Procesando orden de venta con datos:', data);
    
    const order = data.note || {};
    let items = order.items || [];
    
    // Primero, mapear TODOS los datos básicos
    const mappedData = this.mapDataForDocument(data, DocumentType.DELIVERY_NOTE);
    
    // Reemplazar TODOS los placeholders básicos primero
    Object.keys(mappedData).forEach(key => {
      const placeholder = `[[${key}]]`;
      const value = mappedData[key] !== undefined ? mappedData[key] : '';
      
      // Reemplazar todas las ocurrencias del placeholder
      while (html.includes(placeholder)) {
        html = html.replace(placeholder, value);
      }
    });
    
    // Luego procesar los items de productos
    let itemsHtml = '';
    
    if (items.length === 0) {
      // Si no hay items, crear uno básico con el total de la orden
      itemsHtml = `
        <tr>
          <td>1</td>
          <td>Productos y servicios</td>
          <td>${this.formatCurrency(order.total || 0)}</td>
          <td>${this.formatCurrency(order.total || 0)}</td>
        </tr>
      `;
    } else {
      // Procesar items reales
      items.forEach((item: any) => {
        const quantity = typeof item.quantity === 'string' ? parseFloat(item.quantity) : (item.quantity || 1);
        const description = item.description || 'Producto';
        const unitPrice = typeof item.unitPrice === 'string' ? parseFloat(item.unitPrice) : (item.unitPrice || 0);
        const total = typeof item.total === 'string' ? parseFloat(item.total) : (item.total || (quantity * unitPrice));
        
        itemsHtml += `
          <tr>
            <td>${quantity}</td>
            <td>${description}</td>
            <td>${this.formatCurrency(unitPrice)}</td>
            <td>${this.formatCurrency(total)}</td>
          </tr>
        `;
      });
    }
    
    // Reemplazar placeholder de productos
    html = html.replace('[[FILAS_PRODUCTOS]]', itemsHtml);
    
    console.log('✅ Orden procesada exitosamente');
    return html;
  }

  // Método para cargar CSS base
  private loadCSS(path: string): Observable<string> {
    console.log('📄 Cargando CSS base desde:', path);
    return this.http.get(path, { 
      responseType: 'text',
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    }).pipe(
      tap(css => console.log('✅ CSS base cargado, tamaño:', css.length, 'caracteres')),
      catchError(error => {
        console.warn(`⚠️ Error cargando CSS base ${path}, usando estilos de respaldo:`, error);
        return of(this.getFallbackCSS());
      })
    );
  }

  // Método para cargar CSS específico del diseño
  private loadDesignCSS(designType: string): Observable<string> {
    const cssPath = this.cssDesignPaths[designType];
    
    if (!cssPath) {
      console.warn(`⚠️ No se encontró CSS para el diseño ${designType}`);
      return of('');
    }
    
    console.log('🎨 Cargando CSS del diseño desde:', cssPath);
    return this.http.get(cssPath, { 
      responseType: 'text',
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    }).pipe(
      tap(css => console.log('✅ CSS del diseño cargado, tamaño:', css.length, 'caracteres')),
      catchError(error => {
        console.warn(`⚠️ Error cargando CSS del diseño ${designType}:`, error);
        return of('');
      })
    );
  }

  // CSS de respaldo en caso de error
  private getFallbackCSS(): string {
    return `
      @page { size: A4; margin: 10mm; }
      body { 
        font-family: Arial, sans-serif; 
        font-size: 12px; 
        margin: 0; 
        padding: 15mm; 
        line-height: 1.4;
        color: #333;
      }
      .container { 
        border: 2px solid #000; 
        border-radius: 25px; 
        padding: 20px; 
        max-width: 190mm;
        margin: 0 auto;
      }
      table { 
        width: 100%; 
        border-collapse: collapse; 
        margin: 15px 0;
      }
      th, td { 
        border: 1px solid #333; 
        padding: 8px; 
        font-size: 11px;
      }
      th {
        background-color: #f8f9fa;
        font-weight: bold;
      }
      .logo-container img { 
        max-width: 150px; 
        max-height: 80px; 
        object-fit: contain;
      }
    `;
  }

  // Procesar plantilla con datos (reemplaza la lógica anterior)
  private processTemplateWithData(template: string, data: any, designType: string): string {
    console.log('🔄 Procesando plantilla con datos para diseño:', designType);
    console.log('🔍 Tipo de diseño:', designType);
    console.log('🔍 ¿Es professional-delivery?', designType === 'professional-delivery');
    console.log('🔍 ¿Contiene CONCEPTO?', template.includes('CONCEPTO'));
    console.log('🔍 Data.designType:', data.designType);
    console.log('🔍 Parameter designType:', designType);

    if (designType === 'professional-delivery') {
      console.log('🏢 Usando procesamiento específico para plantilla profesional');
      return this.processProfessionalTemplate(template, data);
    }
    
    // Determinar el tipo de documento
    const documentType = data.documentType || DocumentType.DELIVERY_NOTE;
    
    // Procesar según el tipo específico
    if (documentType === DocumentType.SALES_ORDER || designType.includes('delivery')) {
      return this.processOrderItems(template, data);
    } else if (designType === 'professional-delivery') {
      console.log('🏢 Usando procesamiento específico para plantilla profesional');
      return this.processProfessionalTemplate(template, data);
    } else {
      // Procesamiento estándar
      return this.processTemplate(template, data, documentType);
    }
  }

  // RESTO DE MÉTODOS EXISTENTES (mapDataForDocument, getLogoUrl, etc.) 
  // ... [mantener todos los métodos restantes sin cambios]

  /**
   * Obtiene la URL del logo del usuario
   */
  private getLogoUrl(): Observable<{url: string, fallbackUsed: boolean}> {
    // Si ya tenemos el logo en caché, lo usamos
    if (this.logoCache) {
      return of(this.logoCache);
    }

    // Intentar obtener el logo del servicio
    return this.logoService.getLogo().pipe(
      map(response => {
        const logoUrl = response && response.url ? response.url : '/assets/images/logo.png';
        const fallbackUsed = !(response && response.url);
        
        // Guardar en caché
        this.logoCache = { url: logoUrl, fallbackUsed };
        
        return this.logoCache;
      }),
      catchError(error => {
        console.warn('Error al obtener logo, usando el predeterminado:', error);
        // Si hay error, usar el logo por defecto
        this.logoCache = { url: '/assets/images/logo.png', fallbackUsed: true };
        return of(this.logoCache);
      })
    );
  }

  /**
   * Determina qué diseño utilizar basado en las preferencias del usuario o datos específicos
   */
  private determineDesign(documentType: DocumentType, data: any): Observable<string> {
    // Si los datos especifican un diseño específico, usarlo
    if (data && data.designType) {
      console.log('Usando diseño específico:', data.designType);
      return of(data.designType as string);
    }
    
    // De lo contrario, obtener de las configuraciones del usuario
    return this.designSettings.getUserDesignSettings().pipe(
      map(settings => {
        const designType = this.designSettings.getDesignForDocumentType(documentType, settings);
        console.log('Usando diseño de preferencias del usuario:', designType);
        return designType;
      })
    );
  }

  /**
   * Obtiene el HTML de la plantilla
   */
  private getTemplateHtml(designType: string): Observable<string> {
    const templatePath = this.designPaths[designType];
    
    if (!templatePath) {
      console.error(`Plantilla no encontrada para el diseño: ${designType}`);
      return throwError(() => new Error(`Plantilla no encontrada para el diseño: ${designType}`));
    }
    
    console.log(`Intentando cargar plantilla desde: ${templatePath}`);
    
    return this.http.get(templatePath, { 
      responseType: 'text',
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    }).pipe(
      tap(response => {
        console.log(`Plantilla cargada correctamente: ${designType}`);
        // Opcionalmente, loguear los primeros 100 caracteres para verificar
        console.log(`Primeros 100 caracteres: ${response.substring(0, 100)}`);
      }),
      catchError(error => {
        console.error(`Error al cargar plantilla ${templatePath}:`, error);
        console.error(`Código de estado: ${error.status}, mensaje: ${error.statusText}`);
        return throwError(() => new Error(`Error al cargar la plantilla del documento: ${error.status} ${error.statusText}`));
      })
    );
  }

  /**
   * Obtiene el diseño predeterminado para un tipo de documento
   */
  private getDefaultDesign(documentType: DocumentType): string {
    switch (documentType) {
      case DocumentType.INVOICE:
        return 'classic-invoice';
      case DocumentType.DELIVERY_NOTE:
        return 'classic-delivery';
      case DocumentType.QUOTE:
        return 'classic-quote';
      default:
        return 'classic-invoice';
    }
  }

  /**
   * Procesa la plantilla reemplazando los placeholders con datos reales
   */
  private processTemplate(template: string, data: any, documentType: DocumentType): string {
    let processedHtml = template;
    
    // Mapear los datos según el tipo de documento
    const mappedData = this.mapDataForDocument(data, documentType);

    // Reemplazar placeholders básicos
    Object.keys(mappedData).forEach(key => {
      const placeholder = `[[${key}]]`;
      const value = mappedData[key] !== undefined ? mappedData[key] : '';
      
      // Reemplazar todas las ocurrencias del placeholder
      while (processedHtml.includes(placeholder)) {
        processedHtml = processedHtml.replace(placeholder, value);
      }
    });
    
    // Procesar filas de items según el tipo de documento
    if (documentType === DocumentType.INVOICE) {
      processedHtml = this.processInvoiceItems(processedHtml, data);
    } else if (documentType === DocumentType.DELIVERY_NOTE) {
      processedHtml = this.processDeliveryNoteItems(processedHtml, data);
    } else if (documentType === DocumentType.QUOTE) {
      processedHtml = this.processQuoteItems(processedHtml, data);
    }
    
    return processedHtml;
  }

  /**
   * ACTUALIZADO: Método mapDataForDocument para incluir datos de creative-delivery
   */
  private mapDataForDocument(data: any, documentType: DocumentType): any {
    const mappedData: any = {};
    
    // Mapeo del logo
    mappedData['LOGO_URL'] = data.logoUrl || '/assets/images/logo.png';
    
    if (documentType === DocumentType.INVOICE) {
      // Mapeo específico para facturas
      const invoice = data.invoice || {};
      mappedData['FECHA_EMISION'] = this.formatDate(invoice.date || new Date());
      // ... resto del mapeo de facturas
      
    } else if (documentType === DocumentType.DELIVERY_NOTE) {
      // ACTUALIZADO: Mapeo específico para notas de remisión y órdenes
      const note = data.note || {};
      
      // Datos básicos
      mappedData['NUMERO_FOLIO'] = note.id ? note.id.slice(0, 8) : '';
      mappedData['FECHA_REMISION'] = this.formatDate(note.saleDate || note.createdAt || new Date());
      
      // Información del cliente
      mappedData['NOMBRE_CLIENTE'] = note.customerName || '';
      mappedData['RFC_CLIENTE'] = note.customerRfc || '';
      mappedData['TELEFONO_CLIENTE'] = note.customerPhone || note.phoneCustomer || '';
      mappedData['DIRECCION_CLIENTE'] = note.customerAddress || note.addressCustomer || 'No especificada';
      
      // Información de pago
      mappedData['FORMA_PAGO'] = note.paymentMethod || 'Por definir';
      
      // Totales
      mappedData['SUBTOTAL'] = this.formatCurrency(note.subtotal || note.total || 0);
      mappedData['PORCENTAJE_IVA'] = '16'; // Configurable
      mappedData['MONTO_IVA'] = this.formatCurrency(note.tax || 0);
      mappedData['TOTAL'] = this.formatCurrency(note.total || 0);
      
      // Información de la empresa
      mappedData['NOMBRE_EMPRESA'] = note.companyName || 'Tu Empresa';
      mappedData['EMAIL_EMPRESA'] = note.companyEmail || 'contacto@tuempresa.com';
      mappedData['TELEFONO_EMPRESA'] = note.companyPhone || '(123) 456-7890';
      mappedData['DIRECCION_EMPRESA'] = note.companyAddress || 'Dirección de la empresa';
      
      // Observaciones
      mappedData['OBSERVACIONES'] = note.observations || 'Gracias por su preferencia.';
      
      // AÑADIR: Datos específicos para plantilla profesional
      // Separar la fecha en componentes
      const dateComponents = this.getDateParts(note.saleDate || note.createdAt || new Date());
      mappedData['DIA'] = dateComponents.dia;
      mappedData['MES'] = dateComponents.mes;
      mappedData['AÑO'] = dateComponents.anio;
      mappedData['PERIODO'] = this.formatDate(note.saleDate || note.createdAt || new Date()); // Fecha completa

      // Información del cliente (adaptada para profesional)
      mappedData['NOMBRE_CLIENTE'] = note.customerName || '';
      mappedData['RFC_CLIENTE'] = note.customerRfc || '';
      mappedData['DIRECCION_CLIENTE'] = note.customerAddress || note.addressCustomer || 'No especificada';
      mappedData['CIUDAD_ESTADO_CLIENTE'] = note.customerCity || note.cityCustomer || 'No especificada';
      mappedData['TELEFONO_CLIENTE'] = note.customerPhone || note.phoneCustomer || '';

      // Información de pago y totales
      mappedData['FORMA_PAGO'] = note.paymentMethod || 'Por definir';
      mappedData['SUBTOTAL'] = this.formatCurrency(note.subtotal || note.total || 0);
      mappedData['PORCENTAJE_IVA'] = '16'; // Configurable
      mappedData['MONTO_IVA'] = this.formatCurrency(note.tax || 0);
      mappedData['TOTAL'] = this.formatCurrency(note.total || 0);

      // Información de la empresa
      mappedData['NOMBRE_EMPRESA'] = note.companyName || 'Tu Empresa';
      mappedData['EMAIL_EMPRESA'] = note.companyEmail || 'contacto@tuempresa.com';
      mappedData['TELEFONO_EMPRESA'] = note.companyPhone || '(123) 456-7890';
      mappedData['DIRECCION_EMPRESA'] = note.companyAddress || 'Dirección de la empresa';

      // Observaciones
      mappedData['OBSERVACIONES'] = note.observations || 'Gracias por su preferencia.';
      
    } else if (documentType === DocumentType.QUOTE) {
      // Mapeo para cotizaciones (código existente)
      const quote = data.cotizacion || data.quote || {};
      const currentDate = quote.fechaCreacion ? new Date(quote.fechaCreacion) : new Date();

      mappedData['FECHA_COTIZACION'] = this.formatDate(currentDate);
      mappedData['EMAIL_EMPRESA'] = quote.companyEmail || 'contacto@tuempresa.com';
      mappedData['TELEFONO_EMPRESA'] = quote.companyPhone || '(123) 456-7890';
      mappedData['NOMBRE_EMPRESA'] = quote.companyName || 'Tu Empresa';
      mappedData['NOMBRE_CLIENTE'] = quote.clienteNombre || '';
      mappedData['EMAIL_CLIENTE'] = quote.clienteEmail || '';
      mappedData['NEGOCIO_CLIENTE'] = quote.clienteNegocio || '';
      mappedData['EMAIL_NEGOCIO'] = quote.clienteEmailNegocio || '';
      mappedData['DESCRIPCION_PROYECTO'] = quote.descripcion || quote.observaciones || '';
      
      const diasValidez = quote.diasValidez || this.calculateDaysValid(quote.fechaValidez, quote.fechaCreacion);
      mappedData['DIAS_VALIDEZ'] = diasValidez.toString();
      
      mappedData['SUBTOTAL'] = this.formatCurrency(quote.subtotal || 0);
      mappedData['IVA'] = this.formatCurrency(quote.impuestos || 0);
      mappedData['TOTAL'] = this.formatCurrency(quote.total || 0);
      mappedData['TERMINOS_COTIZACION'] = quote.terminos || 'Esta cotización es válida por el número de días especificado. Los precios están sujetos a cambios después de este período.';
    }
    
    console.log('📊 Datos mapeados:', Object.keys(mappedData));
    return mappedData;
  }

  /**
   * Calcula los días de validez basado en fechas de creación y validez
   */
  private calculateDaysValid(fechaValidez: string | Date, fechaCreacion: string | Date): number {
    if (!fechaValidez || !fechaCreacion) return 30; // Valor por defecto
      
    const dateValidez = new Date(fechaValidez);
    const dateCreacion = new Date(fechaCreacion);
    
    const timeDiff = dateValidez.getTime() - dateCreacion.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
    
    return daysDiff > 0 ? daysDiff : 30;
  }

  /**
   * Procesa las filas de productos/servicios para notas de remisión
   * Compatible con diferentes plantillas, incluyendo minimal y profesional
   */
  private processDeliveryNoteItems(html: string, data: any): string {
    const note = data.note || {};
    let items = note.items || [];
    
    // Si items es un string JSON, parsearlo
    if (typeof items === 'string') {
      try {
        items = JSON.parse(items);
      } catch (e) {
        console.error('Error al parsear items:', e);
        items = [];
      }
    }
    
    // Identificar los placeholders para diferentes plantillas
    const placeholdersToReplace = [
      '[[FILAS_PRODUCTOS]]',
      '[[FILAS_ITEMS]]',
      '[[PRODUCTOS]]'
    ];
    
    // Si no hay items, mostrar mensaje apropiado
    if (items.length === 0) {
      const emptyRow = '<tr><td colspan="4">No hay elementos</td></tr>';
      
      // Reemplazar todos los placeholders encontrados
      let processedHtml = html;
      placeholdersToReplace.forEach(placeholder => {
        if (processedHtml.includes(placeholder)) {
          processedHtml = processedHtml.replace(placeholder, emptyRow);
        }
      });
      
      return processedHtml;
    }
    
    // Detectar qué tipo de plantilla es por la presencia de características específicas
    const isMinimalTemplate = html.includes('VALOR UNITARIO') || 
                             html.includes('IMPORTE') || 
                             html.includes('CIUDAD O ESTADO');
                             
    const isProfessionalTemplate = html.includes('NOMBRE EMPRESA') ||
                                 html.includes('y logo') ||
                                 html.includes('CONCEPTO');
    
    let itemsHtml = '';
    
    // Generar HTML para los items
    items.forEach((item: any) => {
      const quantity = item.quantity || item.cantidad || 1;
      const description = item.description || item.descripcion || '';
      const unitPrice = item.unitPrice || item.precio || item.precioUnitario || 0;
      const total = item.total || item.subtotal || (quantity * unitPrice);
      
      itemsHtml += `
        <tr>
          <td>${quantity}</td>
          <td>${description}</td>
          <td>${this.formatCurrency(unitPrice)}</td>
          <td>${this.formatCurrency(total)}</td>
        </tr>
      `;
    });
    
    // Reemplazar todos los placeholders encontrados
    let processedHtml = html;
    placeholdersToReplace.forEach(placeholder => {
      if (processedHtml.includes(placeholder)) {
        processedHtml = processedHtml.replace(placeholder, itemsHtml);
      }
    });
    
    return processedHtml;
  }

  /**
   * Obtiene las partes de la fecha (día, mes, año) de forma separada
   */
  private getDateParts(date: Date | string): { dia: string, mes: string, anio: string } {
    if (!date) {
      date = new Date();
    }
    
    if (typeof date === 'string') {
      date = new Date(date);
    }
    
    return {
      dia: date.getDate().toString().padStart(2, '0'),
      mes: (date.getMonth() + 1).toString().padStart(2, '0'), // getMonth() es base 0
      anio: date.getFullYear().toString().slice(-2) // Obtener solo los últimos 2 dígitos del año
    };
  }

  /**
   * Procesa las filas de productos/servicios para facturas
   */
  private processInvoiceItems(html: string, data: any): string {
    const invoice = data.invoice || {};
    const items = invoice.items || [];
    
    if (items.length === 0) {
      return html.replace('[[FILAS_ITEMS]]', '<tr><td colspan="4">No hay elementos</td></tr>');
    }
    
    let itemsHtml = '';
    items.forEach((item: any, index: number) => {
      itemsHtml += `
        <tr>
          <td>${item.description || ''}</td>
          <td>${item.quantity || 1}</td>
          <td>${this.formatCurrency(item.unitPrice || 0)}</td>
          <td>${this.formatCurrency(item.total || 0)}</td>
        </tr>
      `;
    });
    
    return html.replace('[[FILAS_ITEMS]]', itemsHtml);
  }

  /**
   * Procesa las filas de productos/servicios para cotizaciones
   * Versión corregida para evitar duplicación y separar descripción/observaciones
   */
  private processQuoteItems(html: string, data: any): string {
    console.log('Procesando items de cotización');
    
    // Aceptar tanto quote como cotizacion en los datos
    const quote = data.cotizacion || data.quote || {};
    
    // Obtener los items
    let items = quote.items || [];
    
    // Si items es un string, intentar parsearlo como JSON
    if (typeof items === 'string') {
      try {
        items = JSON.parse(items);
      } catch (e) {
        console.error('Error al parsear items como JSON:', e);
        items = [];
      }
    }
    
    // Eliminar duplicados de items basados en la descripción
    if (Array.isArray(items) && items.length > 1) {
      // Usar un Map para eliminar duplicados
      const uniqueItems = new Map();
      
      items.forEach(item => {
        const key = item.descripcion || item.description || '';
        uniqueItems.set(key, item);
      });
      
      // Convertir el Map de vuelta a un array
      items = Array.from(uniqueItems.values());
      console.log('Items después de eliminar duplicados:', items);
    }
    
    // Si no hay items, crear uno predeterminado
    if (!Array.isArray(items) || items.length === 0) {
      console.log('No se encontraron items para mostrar, creando uno predeterminado');
      
      // Obtener datos para el item predeterminado
      const proyecto = quote.descripcionProyecto || quote.observaciones || '';
      let nombreProducto = 'Producto o servicio';
      
      // Intentar extraer un nombre más específico
      if (proyecto) {
        const palabras = proyecto.split(' ');
        if (palabras.length >= 2) {
          nombreProducto = palabras.slice(0, 2).join(' ');
        }
      }
      
      const subtotal = quote.subtotal || 0;
      const total = quote.total || subtotal;
      
      // Crear un item predeterminado
      items = [{
        cantidad: 1,
        descripcion: nombreProducto,
        precioUnitario: subtotal,
        total: total
      }];
      
      console.log('Item predeterminado creado:', items[0]);
    }
    
    // Generar el HTML para los items
    let itemsHtml = '';
    items.forEach((item, index) => {
      // Normalizar propiedades
      const quantity = item.cantidad || item.quantity || 1;
      
      // Asegurar que la descripción sea clara y no repita las observaciones
      let description = '';
      if (item.descripcion !== undefined) {
        description = typeof item.descripcion === 'string' ? item.descripcion : String(item.descripcion);
      } else if (item.description !== undefined) {
        description = typeof item.description === 'string' ? item.description : String(item.description);
      } else {
        description = 'Producto o servicio';
      }
      
      // Eliminar las observaciones de la descripción si están incluidas
      const observaciones = quote.descripcionProyecto || quote.observaciones || '';
      if (observaciones && description.includes(observaciones)) {
        description = description.replace(observaciones, '').trim();
        if (description.length < 3) {
          description = 'Producto o servicio';
        }
      }
      
      const unitPrice = item.precioUnitario || item.unitPrice || item.precio || 0;
      const total = item.total || item.importe || (quantity * unitPrice);
      
      // Crear la fila HTML con estilos inline para asegurar que la descripción se muestre correctamente
      itemsHtml += `
        <tr>
          <td>${quantity}</td>
          <td style="max-width: 250px; word-wrap: break-word; text-align: left;">${description}</td>
          <td style="text-align: right;">${this.formatCurrency(unitPrice)}</td>
          <td style="text-align: right;">${this.formatCurrency(total)}</td>
        </tr>
      `;
    });
    
    // Reemplazar los placeholders con las filas generadas
    let processedHtml = html;
    
    // Reemplazar FILAS_ITEMS si existe
    if (processedHtml.includes('[[FILAS_ITEMS]]')) {
      processedHtml = processedHtml.replace('[[FILAS_ITEMS]]', itemsHtml);
    }
    
    // Reemplazar FILAS_PRODUCTOS si existe
    if (processedHtml.includes('[[FILAS_PRODUCTOS]]')) {
      processedHtml = processedHtml.replace('[[FILAS_PRODUCTOS]]', itemsHtml);
    }
    
    // Asegurar que las observaciones se muestren en la sección correcta
    if (quote.descripcionProyecto && processedHtml.includes('[[DESCRIPCION_PROYECTO]]')) {
      processedHtml = processedHtml.replace('[[DESCRIPCION_PROYECTO]]', quote.descripcionProyecto);
    } else if (quote.observaciones && processedHtml.includes('[[DESCRIPCION_PROYECTO]]')) {
      processedHtml = processedHtml.replace('[[DESCRIPCION_PROYECTO]]', quote.observaciones);
    }
    
    return processedHtml;
  }

  /**
   * Formatea una fecha para mostrarla en el documento
   */
  private formatDate(date: Date | string): string {
    if (!date) return '';
    
    if (typeof date === 'string') {
      date = new Date(date);
    }
    
    return date.toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  }

  /**
   * Formatea un valor monetario para mostrar en el documento
   */
  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(value);
  }

  /**
   * Verifica la consistencia de las rutas de las plantillas
   */
  public verifyTemplates(): void {
    console.log('Verificando rutas de plantillas:');
    Object.entries(this.designPaths).forEach(([key, path]) => {
      console.log(`${key}: ${path}`);
      
      // Opcionalmente, podrías intentar cargar cada plantilla para verificar que existe
      this.http.get(path, { responseType: 'text' }).pipe(
        tap(() => console.log(`✓ Plantilla ${key} accesible`)),
        catchError(error => {
          console.error(`✗ Error con plantilla ${key}: ${error.status} ${error.statusText}`);
          return of(null);
        })
      ).subscribe();
    });
  }
}