import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { map, catchError, switchMap, tap } from 'rxjs/operators';
import { LogoService } from './logo.service';
import { DesignSettingsService } from './design-settings.service';
import { DocumentType } from '../shared/enums/document-type.enum';

@Injectable({
  providedIn: 'root'
})
export class QuoteDocumentService {
  // Rutas a las plantillas de cotizaciones
  private designPaths: { [key: string]: string } = {
    'classic-quote': '/assets/images/designs/quotes/classic-quote.html',
    'modern-quote': '/assets/images/designs/quotes/modern-quote.html',
    'minimal-quote': '/assets/images/designs/quotes/minimal-quote.html',
    'professional-quote': '/assets/images/designs/quotes/professional-quote.html',
    'creative-quote': '/assets/images/designs/quotes/creative-quote.html'
  };

  // Para almacenar en caché el logo
private logoCache: {url: string, base64?: string, fallbackUsed: boolean} | null = null;

  constructor(
    private http: HttpClient,
    private logoService: LogoService,
    private designSettings: DesignSettingsService
  ) { }

  /**
   * Genera un documento HTML para una cotización
   * @param data Datos de la cotización
   * @param designType Tipo de diseño (opcional)
   * @returns Observable con el HTML generado
   */
  generateQuoteDocument(data: any, designType?: string): Observable<string> {
    // Obtener logo primero y luego generar el documento
    return this.getLogoUrl().pipe(
      tap(logoResult => {
      data.logoUrl = logoResult.url || '';
      data.logoFallbackUsed = logoResult.fallbackUsed || false;
      
      // Verificar si existe la propiedad base64 antes de asignarla
      if ('base64' in logoResult) {
        data.logoBase64 = logoResult.base64;
      } else {
        data.logoBase64 = ''; // Proporcionar un valor predeterminado
      }
    }),
      switchMap(() => this.determineDesign(designType, data)),
      tap(design => console.log('Diseño determinado:', design)),
      map(design => {
        // Verificar si el diseño existe
        if (!this.designPaths[design]) {
          console.warn(`El diseño ${design} no existe. Usando diseño por defecto.`);
          design = this.getDefaultDesign();
        }
        return design;
      }),
      // Obtener la plantilla HTML
      switchMap(design => {
        // Guardar el tipo de diseño para usarlo después
        data.currentDesignType = design;
        return this.getTemplateHtml(design);
      }),
      // Procesar la plantilla con los datos
      map(template => this.processTemplate(template, data)),
      // Aplicar estilos y ajustes para PDF
      map(html => this.preparePdfHtml(html)),
      catchError(error => {
        console.error('Error al generar documento de cotización:', error);
        return throwError(() => new Error('Error al generar documento. Por favor intente nuevamente.'));
      })
    );
  }

  /**
   * Determina qué diseño utilizar basado en las preferencias del usuario o datos específicos
   */
  private determineDesign(designType: string | undefined, data: any): Observable<string> {
    // Si se especifica un diseño, usarlo
    if (designType && this.designPaths[designType]) {
      console.log('Usando diseño específico:', designType);
      return of(designType);
    }
    
    // Si los datos especifican un diseño, usarlo
    if (data && data.designType && this.designPaths[data.designType]) {
      console.log('Usando diseño de los datos:', data.designType);
      return of(data.designType);
    }
    
    // De lo contrario, obtener de las configuraciones del usuario
    return this.designSettings.getUserDesignSettings().pipe(
      map(settings => {
        const design = this.designSettings.getDesignForDocumentType(DocumentType.QUOTE, settings);
        console.log('Usando diseño de preferencias del usuario:', design);
        return this.designPaths[design] ? design : this.getDefaultDesign();
      })
    );
  }

  /**
   * Obtiene el diseño predeterminado para cotizaciones
   */
  private getDefaultDesign(): string {
    return 'classic-quote';
  }

  /**
   * Obtiene la URL del logo del usuario
   */
  private getLogoUrl(): Observable<{url: string, base64?: string, fallbackUsed: boolean}> {
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
      this.logoCache = { 
        url: logoUrl, 
        fallbackUsed,
        base64: '' // Inicializar la propiedad base64
      };
      
      return this.logoCache;
    }),
    catchError(error => {
      console.warn('Error al obtener logo, usando el predeterminado:', error);
      // Si hay error, usar el logo por defecto
      this.logoCache = { 
        url: '/assets/images/logo.png', 
        fallbackUsed: true,
        base64: '' // Inicializar la propiedad base64
      };
      return of(this.logoCache);
    })
  );
}
  /**
   * logo a base64
   */
  private getLogoForPdf(): Observable<{url: string, base64: string, fallbackUsed: boolean}> {
  // Si ya tenemos el logo en caché con base64, lo usamos
  if (this.logoCache && this.logoCache.base64) {
    return of({
      url: this.logoCache.url,
      base64: this.logoCache.base64,
      fallbackUsed: this.logoCache.fallbackUsed
    });
  }

  // Intentar obtener el logo del servicio
  return this.logoService.getLogo().pipe(
    switchMap(response => {
      const logoUrl = response && response.url ? response.url : '/assets/images/logo.png';
      const fallbackUsed = !(response && response.url);
      
      // Obtener la imagen y convertirla a base64
      return this.http.get(logoUrl, { responseType: 'blob' }).pipe(
        switchMap(blob => {
          return new Observable<{url: string, base64: string, fallbackUsed: boolean}>(observer => {
            const reader = new FileReader();
            reader.onloadend = () => {
              // Crear objeto con URL y base64
              const result = {
                url: logoUrl,
                base64: reader.result as string,
                fallbackUsed: fallbackUsed
              };
              
              // Actualizar el caché
              this.logoCache = result;
              
              observer.next(result);
              observer.complete();
            };
            reader.readAsDataURL(blob);
          });
        }),
        catchError(error => {
          console.warn('Error al convertir logo a base64, usando respaldo:', error);
          const result = {
            url: logoUrl,
            base64: '',  // Cadena vacía como respaldo
            fallbackUsed: true
          };
          this.logoCache = result;
          return of(result);
        })
      );
    }),
    catchError(error => {
      console.warn('Error al obtener logo, usando el predeterminado:', error);
      const result = {
        url: '/assets/images/logo.png',
        base64: '',  // Cadena vacía como respaldo
        fallbackUsed: true
      };
      this.logoCache = result;
      return of(result);
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
    
    return this.http.get(templatePath, { responseType: 'text' }).pipe(
      tap(response => {
        console.log(`Plantilla cargada correctamente: ${designType}`);
      }),
      catchError(error => {
        console.error(`Error al cargar plantilla ${templatePath}:`, error);
        return throwError(() => new Error(`Error al cargar la plantilla: ${error.status} ${error.statusText}`));
      })
    );
  }

  /**
   * Procesa la plantilla reemplazando los placeholders con datos reales
   */
  private processTemplate(template: string, data: any): string {
  console.log('Procesando plantilla con datos:', data);
  
  // Mapear los datos para adecuarlos a los placeholders de la plantilla
  const mappedData = this.mapDataForTemplate(data);
  
  // Reemplazar placeholders básicos
  let processedHtml = template;
  Object.keys(mappedData).forEach(key => {
    const placeholder = `[[${key}]]`;
    const value = mappedData[key] !== undefined ? mappedData[key] : '';
    
    // Reemplazar todas las ocurrencias del placeholder
    while (processedHtml.includes(placeholder)) {
      processedHtml = processedHtml.replace(placeholder, value);
    }
  });
  
  // Procesar filas de items
  processedHtml = this.processQuoteItems(processedHtml, data);
  
  return processedHtml;
}

  /**
   * Mapea los datos para adecuarlos a los placeholders de la plantilla
   */
  private mapDataForTemplate(data: any): any {
    const mappedData: any = {};
    
    // Obtener la cotización de los datos
    const quote = data.cotizacion || {};
    
    // Mapeo del logo
    mappedData['LOGO_URL'] = data.logoUrl || '/assets/images/logo.png';
    
    // Fecha de cotización
    const currentDate = quote.fechaCreacion ? new Date(quote.fechaCreacion) : new Date();
    mappedData['FECHA_COTIZACION'] = this.formatDate(currentDate);
    
    // Datos de la empresa
    mappedData['EMAIL_EMPRESA'] = quote.companyEmail || 'contacto@tuempresa.com';
    mappedData['TELEFONO_EMPRESA'] = quote.companyPhone || '(123) 456-7890';
    mappedData['NOMBRE_EMPRESA'] = quote.companyName || 'Tu Empresa';
    
    // Datos del cliente
    mappedData['NOMBRE_CLIENTE'] = quote.clienteNombre || '';
    mappedData['EMAIL_CLIENTE'] = quote.clienteEmail || '';
    mappedData['NEGOCIO_CLIENTE'] = quote.clienteNegocio || '';
    mappedData['EMAIL_NEGOCIO'] = quote.clienteEmailNegocio || '';
    
    // Descripción del proyecto
    mappedData['DESCRIPCION_PROYECTO'] = quote.descripcionProyecto || quote.observaciones || '';
    
    // Validez de la cotización
    const diasValidez = quote.diasValidez || this.calculateDaysValid(quote.fechaValidez, quote.fechaCreacion);
    mappedData['DIAS_VALIDEZ'] = diasValidez.toString();
    
    // Totales
    mappedData['SUBTOTAL'] = this.formatCurrency(quote.subtotal || 0);
    mappedData['IVA'] = this.formatCurrency(quote.impuestos || 0);
    mappedData['TOTAL'] = this.formatCurrency(quote.total || 0);
    
    // Términos y condiciones
    mappedData['TERMINOS_COTIZACION'] = quote.terminos || 'Esta cotización es válida por el número de días especificado. Los precios están sujetos a cambios después de este período.';
    
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
 * Versión actualizada del método processQuoteItems para trabajar con datos enriquecidos
 */
private processQuoteItems(html: string, data: any): string {
  console.log('Procesando items de cotización');
  
  // Obtener la cotización y su información
  const quote = data.cotizacion || {};
  let items = quote.items || [];
  
  // Si items es string, parsearlo como JSON
  if (typeof items === 'string') {
    try {
      items = JSON.parse(items);
    } catch (e) {
      console.error('Error al parsear items como JSON:', e);
      items = [];
    }
  }
  
  // Verificar placeholders
  const hasItemsPlaceholder = html.includes('[[FILAS_ITEMS]]');
  const hasProductosPlaceholder = html.includes('[[FILAS_PRODUCTOS]]');
  const hasDescripcionProyecto = html.includes('[[DESCRIPCION_PROYECTO]]');
  
  // Si no hay placeholders o no hay items, devolver el HTML sin cambios
  if ((!hasItemsPlaceholder && !hasProductosPlaceholder) || !Array.isArray(items) || items.length === 0) {
    const emptyRow = '<tr><td colspan="4">No hay elementos</td></tr>';
    
    // Reemplazar placeholders de tabla
    if (hasItemsPlaceholder) {
      html = html.replace('[[FILAS_ITEMS]]', emptyRow);
    }
    if (hasProductosPlaceholder) {
      html = html.replace('[[FILAS_PRODUCTOS]]', emptyRow);
    }
    if (html.includes('[[FILAS_ITEMS]][[FILAS_PRODUCTOS]]')) {
      html = html.replace('[[FILAS_ITEMS]][[FILAS_PRODUCTOS]]', emptyRow);
    }
    
    // Reemplazar descripción del proyecto
    if (hasDescripcionProyecto) {
      html = html.replace('[[DESCRIPCION_PROYECTO]]', quote.observaciones || '');
    }
    
    return html;
  }
  
  // Generar el HTML para los items
  let itemsHtml = '';
  items.forEach((item, index) => {
    const quantity = item.cantidad || 1;
    
    // Determinar la descripción usando la jerarquía de fuentes
    let description = '';
    
    // Prioridad:
    // 1. nombreItem (de QuoteItemResolver)
    // 2. descripcionItem (de QuoteItemResolver)
    // 3. descripcion (campo original)
    if (item.nombreItem) {
      // Usar el nombre del producto/servicio resuelto
      description = item.nombreItem;
    } else if (item.descripcionItem) {
      description = item.descripcionItem;
    } else if (item.descripcion) {
      description = item.descripcion;
      
      // Si la descripción contiene las observaciones, intentar limpiarla
      const observaciones = quote.observaciones || '';
      if (observaciones && description.includes(observaciones)) {
        description = description.replace(observaciones, '').trim();
        if (description.length < 3) {
          const palabras = observaciones.split(' ');
          description = palabras.length > 0 ? palabras[0] : 'Producto/Servicio';
        }
      }
    } else {
      description = 'Producto/Servicio';
    }
    
    // Información de precios
    const unitPrice = item.precioUnitario || 0;
    const total = item.total || (quantity * unitPrice);
    
    // Generar la fila HTML con estilos inline
    itemsHtml += `
      <tr>
        <td>${quantity}</td>
        <td style="max-width: 250px; word-wrap: break-word; text-align: left;">${description}</td>
        <td style="text-align: right;">${this.formatCurrency(unitPrice)}</td>
        <td style="text-align: right;">${this.formatCurrency(total)}</td>
      </tr>
    `;
  });
  
  // Reemplazar los placeholders de tablas
  if (html.includes('[[FILAS_ITEMS]][[FILAS_PRODUCTOS]]')) {
    html = html.replace('[[FILAS_ITEMS]][[FILAS_PRODUCTOS]]', itemsHtml);
  } else {
    if (hasItemsPlaceholder) {
      html = html.replace('[[FILAS_ITEMS]]', itemsHtml);
    }
    if (hasProductosPlaceholder) {
      html = html.replace('[[FILAS_PRODUCTOS]]', itemsHtml);
    }
  }
  
  // Reemplazar la descripción del proyecto (observaciones)
  if (hasDescripcionProyecto) {
    html = html.replace('[[DESCRIPCION_PROYECTO]]', quote.observaciones || '');
  }
  
  return html;
}

  /**
   * Prepara el HTML para la generación de PDF asegurando que los bordes se muestren correctamente
   */
  private preparePdfHtml(html: string): string {
    // Estilos adicionales para asegurar que los bordes se muestren correctamente en PDF
    const pdfStyles = `
      <style>
        @page {
          margin: 0;
          padding: 0;
        }
        body {
          margin: 0;
          padding: 0;
        }
        .pdf-wrapper {
          padding: 20mm;
          box-sizing: border-box;
        }
        .container {
          box-shadow: none !important;
          border: 2px solid #000 !important;
          border-radius: 25px !important;
          overflow: hidden !important;
          padding: 20px !important;
          box-sizing: border-box !important;
          background-color: white !important;
          margin: 0 auto !important;
          width: 100% !important;
          max-width: 190mm !important;
        }
        @media print {
          .pdf-wrapper {
            padding: 0;
          }
          .container {
            border: 2px solid #000 !important;
            border-radius: 25px !important;
            overflow: hidden !important;
          }
        }
        /* Estilo para logo */
        .logo-container img {
          max-width: 100%;
          max-height: 100px;
          object-fit: contain;
        }
        
        /* Estilos adicionales para la tabla de servicios */
        .services-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 30px;
          table-layout: fixed;
        }
        
        .services-table th:nth-child(1), 
        .services-table td:nth-child(1) {
          width: 15%;
          text-align: center;
        }
        
        .services-table th:nth-child(2), 
        .services-table td:nth-child(2) {
          width: 45%;
          text-align: left;
          word-wrap: break-word;
          word-break: normal;
          overflow-wrap: break-word;
        }
        
        .services-table th:nth-child(3), 
        .services-table td:nth-child(3) {
          width: 20%;
          text-align: right;
        }
        
        .services-table th:nth-child(4), 
        .services-table td:nth-child(4) {
          width: 20%;
          text-align: right;
        }
      </style>
    `;

    // Agregar el pdfStyles al head del documento
    if (html.includes('</head>')) {
      html = html.replace('</head>', pdfStyles + '</head>');
    } else if (html.includes('<head>')) {
      html = html.replace('<head>', '<head>' + pdfStyles);
    } else {
      html = '<head>' + pdfStyles + '</head>' + html;
    }

    // Envolver el contenido en un div con padding para PDF
    if (html.includes('<body>') && html.includes('</body>')) {
      html = html.replace('<body>', '<body><div class="pdf-wrapper">');
      html = html.replace('</body>', '</div></body>');
    }

    return html;
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
    console.log('Verificando rutas de plantillas de cotizaciones:');
    Object.entries(this.designPaths).forEach(([key, path]) => {
      console.log(`${key}: ${path}`);
      
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