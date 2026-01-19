import { Component, OnInit, ViewChild, AfterViewInit, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { catchError, finalize } from 'rxjs/operators';
import { of } from 'rxjs';
import * as XLSX from 'xlsx';
import { SalesOrdersService } from '../../../services/ventas/orders/order.service';
import { SalesOrder } from '../../../models/sales-order.model';
import { OrderFormModalComponent } from './order-form-modal/order-form-modal.component';
import { SidebarService } from '../../../shared/services/sidebar.service';
import { Sweetalert } from '../../../functions';
import Swal from 'sweetalert2';
import { DocumentGeneratorService } from '../../../services/document-generator.service';
import { DocumentType } from '../../../shared/enums/document-type.enum';
import { DesignSettingsService } from '../../../services/design-settings.service';
import { SendOrderDialogComponent } from './send-order-dialog/send-order-dialog.component';
import { OrderDetailComponent } from './order-detail/order-detail.component';
import { NoteFormModalComponent } from '../notes/note-form-modal/note-form-modal.component';
interface MobilePaginator {
  pageSize: number;
  pageIndex: number;
}

@Component({
    selector: 'app-orders',
    templateUrl: './orders.component.html',
    styleUrls: ['./orders.component.css'],
    standalone: false
})
export class OrdersComponent implements OnInit, AfterViewInit {
  // Propiedades del componente
  displayedColumns: string[] = ['folio', 'customerName', 'total', 'status', 'createdAt', 'acciones'];
  dataSource = new MatTableDataSource<SalesOrder>([]);
  loading: boolean = false;
  isMobile = false;
  
  // Paginador móvil
  mobilePaginator: MobilePaginator = {
    pageSize: 5,
    pageIndex: 0
  };
  
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private dialog: MatDialog,
    private salesOrdersService: SalesOrdersService,
    private sidebarService: SidebarService,
    private documentGenerator: DocumentGeneratorService,
    private designSettings: DesignSettingsService,
    private snackBar: MatSnackBar,
    private router: Router
  ) {
    this.checkScreenSize();
  }

  ngOnInit(): void {
    this.documentGenerator.verifyTemplates();
    this.loadSalesOrders();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  /**
   * Detecta el tamaño de la pantalla para ajustar la vista
   */
  @HostListener('window:resize')
  checkScreenSize() {
    this.isMobile = window.innerWidth < 600;
  }

  /**
   * Carga las órdenes desde el servicio
   */
  loadSalesOrders() {
    this.loading = true;
    this.salesOrdersService.getAll().pipe(
      catchError((error) => {
        this.handleError(error);
        return of([]);
      }),
      finalize(() => {
        this.loading = false;
      })
    ).subscribe((orders) => {
      console.log('Órdenes recibidas:', orders);
      this.dataSource.data = orders;
      this.dataSource.filterPredicate = this.createFilter();
      
      // Resetear el paginador móvil
      this.mobilePaginator.pageIndex = 0;
    });
  }

  /**
   * Crea una función de filtro personalizada
   */
  createFilter(): (data: SalesOrder, filter: string) => boolean {
    return (data: SalesOrder, filter: string): boolean => {
      const searchTerms = filter.toLowerCase().split(' ');
      
      // Datos a buscar
      const searchableData = [
        data.id,
        data.customerName,
        this.getStatusText(data.status),
        data.total.toString()
      ].map(value => value?.toLowerCase() || '');
      
      // Comprobar que todos los términos de búsqueda existen en algún campo
      return searchTerms.every(term => 
        searchableData.some(value => value.includes(term))
      );
    };
  }

  /**
   * Aplicar filtro a la tabla
   */
  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
    this.dataSource.filterPredicate = (data: SalesOrder, filter: string) => {
    const searchStr = filter.toLowerCase();
    return (
      data.folio?.toLowerCase().includes(searchStr) ||
      data.customerName?.toLowerCase().includes(searchStr) ||
      data.customerRfc?.toLowerCase().includes(searchStr) ||
      data.total?.toString().includes(searchStr) ||
      this.getStatusText(data.status)?.toLowerCase().includes(searchStr)
    );
  };
    
    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
    
    // Resetear el paginador móvil
    this.mobilePaginator.pageIndex = 0;
  }

  /**
   * Abre el diálogo para crear una nueva orden
   */
  agregarOrden() {
    const dialogRef = this.dialog.open(OrderFormModalComponent, {
      width: this.isMobile ? '95%' : '600px',
      disableClose: false,
      autoFocus: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.salesOrdersService.create(result).pipe(
          finalize(() => this.loading = false)
        ).subscribe({
          next: (response) => {
            Sweetalert.fnc('success', 'Orden creada correctamente', null);
            this.loadSalesOrders();
          },
          error: (error) => {
            console.error('Error al crear la orden:', error);
            Sweetalert.fnc('error', 'Error al crear la orden: ' + this.getErrorMessage(error), null);
          }
        });
      }
    });
  }
 /**
 * Aprobar una orden de venta
 */
async aprobarOrden(order: SalesOrder): Promise<void> {
  const confirmed = await Sweetalert.confirmAction(
    '¿Aprobar orden?',
    `¿Deseas aprobar la orden ${order.folio}?`,
    'Sí, aprobar'
  );

  if (confirmed) {
    this.loading = true;
    
    this.salesOrdersService.update(order.id, { status: 'APPROVED' }).subscribe({
      next: () => {
        Sweetalert.fnc('success', 'Orden aprobada correctamente', null);
        this.loadSalesOrders();
      },
      error: (error) => {
        console.error('Error al aprobar orden:', error);
        Sweetalert.fnc('error', 'Error al aprobar la orden', null);
      },
      complete: () => {
        this.loading = false;
      }
    });
  }
}

 /**
 * Ver detalles de una orden en un modal
 */
verDetalle(order: SalesOrder) {
  const dialogRef = this.dialog.open(OrderDetailComponent, {
    width: this.isMobile ? '95%' : '900px',
    maxWidth: '95vw',
    data: order,
    panelClass: 'order-detail-dialog'
  });

  dialogRef.afterClosed().subscribe(result => {
    if (result?.action === 'createSaleNote') {
      this.crearNotaDeVenta(result.order);
    }
  });
}

// 4. AGREGAR ESTE NUEVO MÉTODO:

/**
 * Crear Nota de Venta desde una orden aprobada
 */
crearNotaDeVenta(order: SalesOrder): void {
  console.log('📊 Orden original:', order);
  console.log('📦 Items con impuestos:', order.items);
  
  // ✅ Convertir todos los valores numéricos
  const orderData = {
    salesOrderId: order.id,
    customerName: order.customerName,
    customerRfc: order.customerRfc,
    customerAddress: order.customerAddress,
    items: order.items.map(item => ({
      productId: item.productId,
      description: item.description,
      quantity: Number(item.quantity) || 1,
      unitPrice: Number(item.unitPrice) || 0,
      subtotal: Number(item.subtotal) || 0,
      tax: Number(item.tax) || 0,
      total: Number(item.total) || 0
    })),
    subtotal: Number(order.subtotal) || 0,
    tax: Number(order.tax) || 0,
    total: Number(order.total) || 0,
    sucursalId: order.sucursalId
  };
  
  console.log('📤 OrderData con números:', orderData);
  
  const dialogRef = this.dialog.open(NoteFormModalComponent, {
    width: this.isMobile ? '95%' : '800px',
    data: {
      mode: 'create',
      fromOrder: true,
      orderData: {
        salesOrderId: order.id,
        customerName: order.customerName,
        customerRfc: order.customerRfc,
        customerAddress: order.customerAddress,
        items: order.items,           // ✅ Deben tener tax
        subtotal: Number(order.subtotal) || 0,
        tax: Number(order.tax) || 0,  // ✅ Total de impuestos
        total: Number(order.total) || 0,
        sucursalId: order.sucursalId
      }
    }
  });

  dialogRef.afterClosed().subscribe(result => {
    if (result && result.saved) {
      this.loadSalesOrders();
      
      Sweetalert.confirmAction(
        'Éxito',
        'Nota de venta creada correctamente. ¿Desea ver las notas de venta?',
        'Ver Notas'
      ).then((confirmed) => {
        if (confirmed) {
          this.router.navigate(['/dashboard/ventas/notes']);
        }
      });
    }
  });
}

descargarPDF(id: string): void {
  // Obtener la configuración de diseños del usuario
  this.designSettings.getUserDesignSettings().subscribe({
    next: (settings) => {
      // Para órdenes de venta, usar el diseño de notas de remisión
      let designId = settings.deliveryNoteDesignId || 'classic-delivery';
      
      // Extraer solo el nombre del estilo
      const estilo = designId.replace('-delivery', '');
      
      this.salesOrdersService.descargarPDF(id, estilo).subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          window.open(url);
        },
        error: (error) => {
          console.error('Error al descargar el PDF:', error);
          Sweetalert.fnc('error', 'Error al descargar el PDF', null);
        }
      });
    },
    error: (error) => {
      console.error('Error obteniendo configuración:', error);
      Sweetalert.fnc('error', 'Error al obtener configuración', null);
    }
  });
}




/**
 * Método que replica exactamente la funcionalidad del generatePDF de la vista previa
 * AÑADIR este método a OrdersComponent
 */
private generatePdfFromPreview(html: string, filename: string): void {
  try {
    const generatePdfAsync = async () => {
      try {
        // @ts-ignore
        const html2pdfModule = await import('html2pdf.js');
        const html2pdf = html2pdfModule.default;
        
        // Crear un contenedor temporal que simule la vista previa
        const tempContainer = document.createElement('div');
        tempContainer.className = 'page-container';
        tempContainer.style.position = 'absolute';
        tempContainer.style.top = '-10000px';
        tempContainer.style.left = '-10000px';
        tempContainer.style.background = 'white';
        tempContainer.style.maxWidth = '210mm';
        tempContainer.style.minHeight = '297mm';
        tempContainer.style.padding = '15mm';
        tempContainer.style.boxSizing = 'border-box';
        
        // Añadir el HTML al contenedor
        tempContainer.innerHTML = html;
        
        // Añadir al DOM temporalmente
        document.body.appendChild(tempContainer);
        
        // Esperar a que se renderice
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // USAR EXACTAMENTE LA MISMA CONFIGURACIÓN que la vista previa
        const opt = {
          margin: 0, // Igual que en la vista previa
          filename: `${filename}_${new Date().toISOString().split('T')[0]}.pdf`,
          image: { 
            type: 'jpeg', 
            quality: 0.98 
          },
          html2canvas: { 
            scale: 2, // Igual que en la vista previa
            useCORS: true,
            letterRendering: true,
            scrollX: 0,
            scrollY: 0
          },
          jsPDF: { 
            unit: 'mm', 
            format: 'a4', 
            orientation: 'portrait',
            compress: true
          }
        };
        
        // Generar PDF desde el contenedor temporal
        await html2pdf().from(tempContainer).set(opt).save();
        
        // Limpiar
        document.body.removeChild(tempContainer);
        
        Sweetalert.fnc('close', '', null);
        Sweetalert.fnc('success', 'PDF generado correctamente', null);
        
      } catch (error) {
        console.error('Error generando PDF desde vista previa:', error);
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        Sweetalert.fnc('error', 'Error al generar el PDF: ' + errorMessage, null);
      }
    };
    
    generatePdfAsync();
  } catch (error) {
    console.error('Error general:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    Sweetalert.fnc('error', 'Error general al generar el PDF: ' + errorMessage, null);
  }
}


  /**
   * Editar una orden existente
   */
  editarOrden(order: SalesOrder) {
    // Implementar lógica de edición
    const dialogRef = this.dialog.open(OrderFormModalComponent, {
      width: this.isMobile ? '95%' : '600px',
      data: { order },
      disableClose: false,
      autoFocus: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loading = true;
        this.salesOrdersService.update(order.id, result).pipe(
          finalize(() => this.loading = false)
        ).subscribe({
          next: (response) => {
            Sweetalert.fnc('success', 'Orden actualizada correctamente', null);
            this.loadSalesOrders();
          },
          error: (error) => {
            console.error('Error al actualizar la orden:', error);
            Sweetalert.fnc('error', 'Error al actualizar la orden: ' + this.getErrorMessage(error), null);
          }
        });
      }
    });
  }

  /**
   * Eliminar una orden
   */
  async eliminarOrden(order: SalesOrder) {
    const confirmed = await Sweetalert.confirmDelete(
      '¿Estás seguro?',
      `¿Quieres eliminar la orden #${order.id.slice(0, 8)}? Esta acción no se puede deshacer.`
    );

    if (confirmed) {
      this.loading = true;
      Sweetalert.fnc('loading', 'Procesando solicitud...', null);
      
      this.salesOrdersService.delete(order.id).pipe(
        finalize(() => this.loading = false)
      ).subscribe({
        next: () => {
          // Cerramos el SweetAlert de carga
          Sweetalert.fnc('close', '', null);
          this.loadSalesOrders();
          
          // Mostramos el SweetAlert de éxito
          setTimeout(() => {
            Sweetalert.fnc('success', 'La orden se eliminó correctamente', null);
          }, 100);
        },
        error: (error) => {
          console.error('Error al eliminar la orden:', error);
          Sweetalert.fnc('error', 'Error al eliminar la orden: ' + this.getErrorMessage(error), null);
        }
      });
    }
  }

  

  /**
 * Genera un PDF optimizado a partir de HTML con CSS independiente
 */
private generatePdf(html: string, filename: string): void {
  try {
    const generatePdfAsync = async () => {
      try {
        // @ts-ignore
        const html2pdfModule = await import('html2pdf.js');
        const html2pdf = html2pdfModule.default;
        
        // Crear un contenedor temporal SIN posición absoluta
        const element = document.createElement('div');
        element.innerHTML = html;
        element.style.width = '210mm'; // A4 width
        element.style.minHeight = '0'; // Sin altura mínima
        element.style.maxHeight = 'none'; // Sin límite de altura
        element.style.margin = '0';
        element.style.padding = '0';
        element.style.backgroundColor = 'white';
        
        // NO añadir al DOM con posición absoluta
        
        // Configuración CORREGIDA - Evitar primera página en blanco
        const opt = {
          margin: [8, 8, 8, 8], // Márgenes en mm
          filename: `${filename}_${new Date().toISOString().split('T')[0]}.pdf`,
          image: { 
            type: 'jpeg', 
            quality: 0.95 
          },
          html2canvas: { 
            scale: 1.2,
            useCORS: true,
            letterRendering: true,
            logging: false,
            allowTaint: false,
            scrollX: 0,
            scrollY: 0,
            // Volver a configuración estándar
            windowWidth: 1200,
            windowHeight: 1600,
            foreignObjectRendering: true,
            backgroundColor: '#ffffff'
          },
          jsPDF: { 
            unit: 'mm', 
            format: 'a4', 
            orientation: 'portrait',
            compress: true
          },
          // Configuración simple para evitar problemas
          pagebreak: { 
            mode: 'avoid-all'
          }
        };
        
        // Esperar un momento para que el CSS se aplique
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Generar el PDF directamente del elemento (no del DOM)
        await html2pdf().from(element).set(opt).save();
        
        // Mostrar mensaje de éxito
        Sweetalert.fnc('close', '', null);
        Sweetalert.fnc('success', 'PDF generado correctamente', null);
        
      } catch (error) {
        console.error('Error generando PDF:', error);
        Sweetalert.fnc('error', 'Error al generar el PDF: ' + (error as Error).message, null);
      }
    };
    
    generatePdfAsync();
  } catch (error) {
    console.error('Error general en generación de PDF:', error);
    Sweetalert.fnc('error', 'Error general al generar el PDF', null);
  }
}

/**
 * Método alternativo usando Blob para mayor control
 */
private generatePdfAdvanced(html: string, filename: string): void {
  try {
    const generatePdfAsync = async () => {
      try {
        // @ts-ignore
        const html2pdfModule = await import('html2pdf.js');
        const html2pdf = html2pdfModule.default;
        
        // Crear elemento temporal
        const element = document.createElement('div');
        element.innerHTML = html;
        element.style.position = 'absolute';
        element.style.left = '-9999px';
        element.style.top = '-9999px';
        document.body.appendChild(element);
        
        const opt = {
          margin: 0,
          filename: `${filename}_${new Date().toISOString().split('T')[0]}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { 
            scale: 2,
            useCORS: true,
            letterRendering: true,
            logging: false,
            scrollX: 0,
            scrollY: 0,
            foreignObjectRendering: true
          },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        
        // Generar como blob primero para mayor control
        const pdfBlob = await html2pdf().from(element).set(opt).outputPdf('blob');
        
        // Crear URL del blob y descargarlo
        const url = URL.createObjectURL(pdfBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = opt.filename;
        a.click();
        
        // Limpiar
        URL.revokeObjectURL(url);
        document.body.removeChild(element);
        
        Sweetalert.fnc('close', '', null);
        Sweetalert.fnc('success', 'PDF generado correctamente', null);
        
      } catch (error) {
        console.error('Error generando PDF avanzado:', error);
        Sweetalert.fnc('error', 'Error al generar el PDF: ' + (error as Error).message, null);
      }
    };
    
    generatePdfAsync();
  } catch (error) {
    console.error('Error general:', error);
    Sweetalert.fnc('error', 'Error general al generar el PDF', null);
  }
}

/**
 * Método DEFINITIVO para generar PDF sin página en blanco
 * Este método usa una técnica diferente que evita el problema
 */
private generateDirectPdf(html: string, filename: string): void {
  try {
    const generatePdfAsync = async () => {
      try {
        // @ts-ignore
        const html2pdfModule = await import('html2pdf.js');
        const html2pdf = html2pdfModule.default;
        
        // Crear un iframe oculto para renderizar el contenido
        const iframe = document.createElement('iframe');
        iframe.style.position = 'absolute';
        iframe.style.top = '-10000px';
        iframe.style.left = '-10000px';
        iframe.style.width = '210mm';
        iframe.style.height = '297mm';
        iframe.style.border = 'none';
        
        // Añadir iframe al DOM
        document.body.appendChild(iframe);
        
        // Escribir contenido en el iframe
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (!iframeDoc) {
          throw new Error('No se pudo acceder al documento del iframe');
        }
        
        // Escribir HTML completo en el iframe
        iframeDoc.open();
        iframeDoc.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body { 
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background: white;
                width: 210mm;
                min-height: 297mm;
                margin: 0;
                padding: 0;
              }
            </style>
          </head>
          <body>
            ${html}
          </body>
          </html>
        `);
        iframeDoc.close();
        
        // Esperar a que se renderice completamente
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Obtener el body del iframe para generar el PDF
        const content = iframeDoc.body;
        
        // Configuración optimizada
        const opt = {
          margin: [3, 3, 3, 3],
          filename: `${filename}_${new Date().toISOString().split('T')[0]}.pdf`,
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
            scrollX: 0,
            scrollY: 0,
            logging: false,
            foreignObjectRendering: true,
            // Usar las dimensiones del iframe
            width: iframe.offsetWidth,
            height: iframe.offsetHeight
          },
          jsPDF: { 
            unit: 'mm', 
            format: 'a4', 
            orientation: 'portrait',
            compress: true
          }
        };
        
        // Generar PDF desde el contenido del iframe
        await html2pdf().from(content).set(opt).save();
        
        // Limpiar el iframe
        document.body.removeChild(iframe);
        
        Sweetalert.fnc('close', '', null);
        Sweetalert.fnc('success', 'PDF generado correctamente', null);
        
      } catch (error) {
        console.error('Error generando PDF directo:', error);
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        Sweetalert.fnc('error', 'Error al generar el PDF: ' + errorMessage, null);
      }
    };
    
    generatePdfAsync();
  } catch (error) {
    console.error('Error general:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    Sweetalert.fnc('error', 'Error general al generar el PDF: ' + errorMessage, null);
  }
}

/**
 * Método DEFINITIVO - PDF desde HTML completo con estilos inline
 */
private generateFinalPdf(html: string, filename: string): void {
  try {
    const generatePdfAsync = async () => {
      try {
        // @ts-ignore
        const html2pdfModule = await import('html2pdf.js');
        const html2pdf = html2pdfModule.default;
        
        console.log('🔄 Iniciando generación de PDF...');
        console.log('📄 HTML recibido:', html.substring(0, 200) + '...');
        
        // Configuración optimizada para HTML completo
        const opt = {
          margin: [3, 3, 3, 3], // Márgenes pequeños pero seguros
          filename: `${filename}_${new Date().toISOString().split('T')[0]}.pdf`,
          image: { 
            type: 'jpeg', 
            quality: 0.98 
          },
          html2canvas: { 
            scale: 1.5, // Buena calidad
            useCORS: true,
            letterRendering: true,
            backgroundColor: '#ffffff',
            logging: false,
            allowTaint: false,
            foreignObjectRendering: true,
            // Configuración específica para evitar problemas
            scrollX: 0,
            scrollY: 0,
            windowWidth: 1200,
            windowHeight: 1600
          },
          jsPDF: { 
            unit: 'mm', 
            format: 'a4', 
            orientation: 'portrait',
            compress: true
          },
          // Configuración para página única
          pagebreak: { 
            mode: 'avoid-all'
          }
        };
        
        // Generar PDF directamente desde el HTML completo
        console.log('⚙️ Generando PDF con configuración:', opt);
        await html2pdf().from(html).set(opt).save();
        
        console.log('✅ PDF generado exitosamente');
        Sweetalert.fnc('close', '', null);
        Sweetalert.fnc('success', 'PDF generado correctamente', null);
        
      } catch (error) {
        console.error('❌ Error generando PDF:', error);
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        Sweetalert.fnc('error', 'Error al generar el PDF: ' + errorMessage, null);
      }
    };
    
    generatePdfAsync();
  } catch (error) {
    console.error('❌ Error general:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    Sweetalert.fnc('error', 'Error general al generar el PDF: ' + errorMessage, null);
  }
}

  /**
   * Obtiene información de la empresa (esto debe venir de un servicio o localStorage)
   */
  private getCompanyInfo(): any {
    // Aquí deberías obtener la información de la empresa desde un servicio o localStorage
    // Por ahora se usa un valor predeterminado
    return {
      name: 'Tu Empresa',
      phone: '(123) 456-7890',
      email: 'contacto@tuempresa.com',
      address: 'Calle Principal #123, Ciudad',
      logo: '/assets/images/logo.png'
    };
  }

  /**
   * Exporta las órdenes a formato CSV o Excel
   * @param format Formato de exportación ('csv' o 'xlsx')
   */
  exportarOrdenes(format: string = 'xlsx') {
    if (this.dataSource.data.length === 0) {
      Sweetalert.fnc('info', 'No hay datos para exportar', null);
      return;
    }

    try {
      // Crear datos para exportar
      const data = this.dataSource.data.map(order => ({
        'Folio': order.folio || '',
        'Cliente': order.customerName || '',
        'Total': order.total || 0,
        'Estado': this.getStatusText(order.status) || '',
        'Fecha de Creación': order.createdAt ? new Date(order.createdAt).toLocaleString() : ''
      }));

      // Crear el libro y hoja
      const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(data);
      const workbook: XLSX.WorkBook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Órdenes de Venta');

      // Ajustar anchos de columna
      const columnsWidths = [
        { wch: 15 }, // ID Orden
        { wch: 30 }, // Cliente
        { wch: 15 }, // Total
        { wch: 15 }, // Estado
        { wch: 20 }  // Fecha de Creación
      ];
      worksheet['!cols'] = columnsWidths;

      const fileName = `ordenes_de_venta_${new Date().toISOString().split('T')[0]}`;

      if (format === 'csv') {
        // Exportar como CSV
        const csvContent = XLSX.utils.sheet_to_csv(worksheet);
        this.downloadFile(csvContent, `${fileName}.csv`, 'text/csv');
      } else {
        // Exportar como Excel
        XLSX.writeFile(workbook, `${fileName}.xlsx`);
      }

      Sweetalert.fnc('success', `Exportación a ${format.toUpperCase()} completada`, null);
    } catch (error) {
      console.error('Error al exportar datos:', error);
      Sweetalert.fnc('error', 'Error al exportar los datos', null);
    }
  }

  /**
   * Descarga el archivo generado (para CSV)
   */
  private downloadFile(content: string, fileName: string, contentType: string) {
    const blob = new Blob([content], { type: contentType });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    window.URL.revokeObjectURL(url);
  }
/**
 * Enviar orden de venta por email
 */
enviarPorEmail(order: SalesOrder): void {
  const dialogRef = this.dialog.open(SendOrderDialogComponent, {
    width: '500px',
    data: {
      orderId: order.id,
      customerName: order.customerName,
      total: order.total,
      defaultEmail: '' // Aquí podrías poner el email del cliente si lo tienes
    }
  });

  dialogRef.afterClosed().subscribe(result => {
    if (result) {
      const loadingSnack = this.snackBar.open('Enviando orden de venta...', '', {
        duration: 0
      });

      this.salesOrdersService.sendSaleOrderByEmail(order.id, result).subscribe({
        next: (response) => {
          loadingSnack.dismiss();
          
          Sweetalert.fnc('success', response.message || 'La orden de venta se envió exitosamente', null);
        },
        error: (error) => {
          loadingSnack.dismiss();
          console.error('Error enviando orden:', error);
          
          Sweetalert.fnc('error', 'Error al enviar la orden: ' + this.getErrorMessage(error), null);
        }
      });
    }
  });
}
  /**
   * Obtener el texto del estado
   */
  getStatusText(status: string): string {
    switch (status) {
      case 'PENDING':
        return 'Pendiente';
      case 'PROCESSING':
        return 'En proceso';
      case 'COMPLETED':
        return 'Completada';
      case 'CANCELLED':
        return 'Cancelada';
      default:
        return status;
    }
  }

  /**
   * Obtener la clase CSS para el estado
   */
  getStatusClass(status: string): string {
    switch (status) {
      case 'PENDING':
        return 'status-pending';
      case 'PROCESSING':
        return 'status-processing';
      case 'COMPLETED':
        return 'status-completed';
      case 'CANCELLED':
        return 'status-cancelled';
      default:
        return '';
    }
  }

  /**
   * Obtener la clase CSS para el estado en móvil
   */
  getStatusClassMobile(status: string): string {
    switch (status) {
      case 'PENDING':
        return 'pending';
      case 'PROCESSING':
        return 'processing';
      case 'COMPLETED':
        return 'completed';
      case 'CANCELLED':
        return 'cancelled';
      default:
        return '';
    }
  }

  /**
   * Maneja los errores HTTP
   */
  private handleError(error: any) {
    console.error('Error en OrdersComponent:', error);
    let errorMessage = 'Ocurrió un error al cargar las órdenes';
    
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Error del cliente: ${error.error.message}`;
    } else {
      errorMessage = `Error del servidor: ${error.status}, mensaje: ${error.message}`;
    }
    
    Sweetalert.fnc('error', errorMessage, null);
  }

  /**
   * Extrae el mensaje de error
   */
  private getErrorMessage(error: any): string {
    if (error.error instanceof ErrorEvent) {
      return `Error: ${error.error.message}`;
    } else {
      return `Error del servidor: ${error.status}, mensaje: ${error.message}`;
    }
  }

  // Métodos para paginación móvil
  getMobileStartIndex(): number {
    return this.mobilePaginator.pageIndex * this.mobilePaginator.pageSize;
  }

  getMobileEndIndex(): number {
    const end = (this.mobilePaginator.pageIndex + 1) * this.mobilePaginator.pageSize;
    return Math.min(end, this.dataSource.filteredData.length);
  }

  nextMobilePage(): void {
    if (!this.isLastMobilePage()) {
      this.mobilePaginator.pageIndex++;
    }
  }

  previousMobilePage(): void {
    if (this.mobilePaginator.pageIndex > 0) {
      this.mobilePaginator.pageIndex--;
    }
  }

  isLastMobilePage(): boolean {
    const maxPageIndex = Math.ceil(this.dataSource.filteredData.length / this.mobilePaginator.pageSize) - 1;
    return this.mobilePaginator.pageIndex >= maxPageIndex;
  }
}