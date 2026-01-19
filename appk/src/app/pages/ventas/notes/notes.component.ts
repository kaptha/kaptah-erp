import { Component, ViewChild, OnInit, AfterViewInit, HostListener } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { catchError, finalize } from 'rxjs/operators';
import { of, forkJoin } from 'rxjs';
import * as XLSX from 'xlsx';
import { NoteFormModalComponent } from './note-form-modal/note-form-modal.component';
import { NoteService } from '../../../services/ventas/notes/note.service';
import { DocumentGeneratorService } from '../../../services/document-generator.service';
import { DocumentType } from '../../../shared/enums/document-type.enum';
import { SaleNote } from '../../../models/sale-note.model';
import { Sweetalert } from '../../../functions';
import { DesignSettingsService } from '../../../services/design-settings.service';
import { SendEmailDialogComponent } from './send-email-dialog/send-email-dialog.component';
import { ProductService } from '../../../services/inventory/product.service'; // ✨ NUEVO

interface MobilePaginator {
  pageSize: number;
  pageIndex: number;
}

@Component({
    selector: 'app-notes',
    templateUrl: './notes.component.html',
    styleUrls: ['./notes.component.css'],
    standalone: false
})
export class NotesComponent implements OnInit, AfterViewInit {
  // Propiedades del componente
  displayedColumns: string[] = [
    'folio', 
    'customerName', 
    'customerRfc',
    'saleDate', 
    'total', 
    'paymentMethod', 
    'status', 
    'acciones'
  ];
  dataSource = new MatTableDataSource<SaleNote>([]);
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
    private saleNotesService: NoteService,
    private documentGenerator: DocumentGeneratorService,
    private designSettings: DesignSettingsService,
    private snackBar: MatSnackBar,
    private productService: ProductService // ✨ NUEVO
  ) {
    this.checkScreenSize();
  }

  ngOnInit() {
    this.documentGenerator.verifyTemplates();
    this.loadNotes();
  }

  ngAfterViewInit() {
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
   * Carga las notas desde el servicio
   */
  loadNotes() {
    this.loading = true;
    this.saleNotesService.getAll().pipe(
      catchError((error) => {
        this.handleError(error);
        return of([]);
      }),
      finalize(() => {
        this.loading = false;
      })
    ).subscribe((notes) => {
      this.dataSource.data = notes;
      this.dataSource.filterPredicate = this.createFilter();
      
      // Resetear el paginador móvil
      this.mobilePaginator.pageIndex = 0;
    });
  }
/**
   * Obtener valor seguro para mostrar (sin NaN)
   */
  getSafeTotal(value: any): number {
    const num = Number(value);
    return (isNaN(num) || num === null || num === undefined) ? 0 : num;
  }
  
  /**
   * Formatear moneda de forma segura
   */
  formatCurrency(value: any): string {
    const safeValue = this.getSafeTotal(value);
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(safeValue);
  }

  /**
   * Crea una función de filtro personalizada
   */
  createFilter(): (data: SaleNote, filter: string) => boolean {
    return (data: SaleNote, filter: string): boolean => {
      const searchTerms = filter.toLowerCase().split(' ');
      
      // Datos a buscar
      const searchableData = [
        data.id,
        data.customerName,
        data.customerRfc,
        this.getStatusText(data.status),
        data.paymentMethod,
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
    // ✨ NUEVO: Filtro personalizado para buscar en múltiples campos incluyendo folio
  this.dataSource.filterPredicate = (data: SaleNote, filter: string) => {
    const searchStr = filter.toLowerCase();
    return (
      data.folio?.toLowerCase().includes(searchStr) ||
      data.customerName?.toLowerCase().includes(searchStr) ||
      data.customerRfc?.toLowerCase().includes(searchStr) ||
      data.saleDate?.toString().toLowerCase().includes(searchStr) ||
      data.total?.toString().includes(searchStr)
    );
  };
    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
    
    // Resetear el paginador móvil
    this.mobilePaginator.pageIndex = 0;
  }

  /**
   * ✨ NUEVO: Descontar inventario para productos vendidos
   */
  private updateInventory(items: any[]): Promise<void> {
    return new Promise((resolve, reject) => {
      // Filtrar solo los items que son productos (type === 'product')
      const productItems = items.filter(item => item.productId);
      
      if (productItems.length === 0) {
        console.log('No hay productos para descontar del inventario');
        resolve();
        return;
      }

      console.log('🔄 Actualizando inventario para', productItems.length, 'productos');

      // Crear array de observables para actualizar stock
      const updateObservables = productItems.map(item => 
        this.productService.updateStock(item.productId, -item.quantity)
      );

      // Ejecutar todas las actualizaciones en paralelo
      forkJoin(updateObservables).subscribe({
        next: (results) => {
          console.log('✅ Inventario actualizado exitosamente:', results);
          resolve();
        },
        error: (error) => {
          console.error('❌ Error al actualizar inventario:', error);
          reject(error);
        }
      });
    });
  }

  /**
   * Abre el diálogo para crear una nueva nota
   * ✨ MODIFICADO: Ahora descuenta el inventario después de crear la nota
   */
  agregarNota() {
    const dialogRef = this.dialog.open(NoteFormModalComponent, {
      width: this.isMobile ? '95%' : '600px',
      data: null,
      disableClose: false
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loading = true;
        
        // Primero crear la nota de venta
        this.saleNotesService.create(result).subscribe({
          next: async (response) => {
            console.log('✅ Nota de venta creada:', response);
            
            try {
              // Luego descontar el inventario
              await this.updateInventory(result.items);
              
              Sweetalert.fnc('success', 'Nota creada e inventario actualizado correctamente', null);
              this.loadNotes();
            } catch (error) {
              console.error('Error al actualizar inventario:', error);
              
              // La nota ya fue creada, pero hubo un problema con el inventario
              Sweetalert.fnc('warning', 
                'Nota creada correctamente, pero hubo un problema al actualizar el inventario. Por favor, verifica el stock manualmente.', 
                null
              );
              this.loadNotes();
            } finally {
              this.loading = false;
            }
          },
          error: (error) => {
            console.error('Error al crear la nota:', error);
            this.loading = false;
            
            // Verificar si el error es de stock insuficiente
            const errorMsg = error.error?.message || error.message || 'Error desconocido';
            
            if (errorMsg.includes('stock') || errorMsg.includes('inventario')) {
              Sweetalert.fnc('error', 
                'Stock insuficiente: ' + errorMsg, 
                null
              );
            } else {
              Sweetalert.fnc('error', 
                'Error al crear la nota: ' + this.getErrorMessage(error), 
                null
              );
            }
          }
        });
      }
    });
  }

    /**
   * Editar una nota de venta existente
   */
  editarNota(note: SaleNote) {
    const dialogRef = this.dialog.open(NoteFormModalComponent, {
      width: this.isMobile ? '95%' : '600px',
      data: note,
      disableClose: false
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && note.id) {
        this.loading = true;
        this.saleNotesService.update(note.id, result).subscribe({
          next: (response) => {
            Sweetalert.fnc('success', 'Nota actualizada correctamente', null);
            this.loadNotes();
            this.loading = false;
          },
          error: (error) => {
            console.error('Error al actualizar la nota:', error);
            Sweetalert.fnc('error', 'Error al actualizar la nota: ' + this.getErrorMessage(error), null);
            this.loading = false;
          }
        });
      }
    });
  }

/**
 * Ver detalles de una nota con PDF generado por backend
 */
verDetalle(note: SaleNote) {
  Sweetalert.fnc('loading', 'Generando vista previa...', null);

  // Obtener el diseño seleccionado
  this.designSettings.getUserDesignSettings().subscribe({
    next: (settings) => {
      // Para notas de venta, usar el diseño de notas de remisión
      let designId = settings.deliveryNoteDesignId || 'classic-delivery';
      
      // Extraer solo el nombre del estilo (quitar el sufijo -delivery)
      const estilo = designId.replace('-delivery', '');
      
      console.log('🎨 Diseño completo:', designId);
      console.log('🎨 Estilo para template:', estilo);
      
      // Llamar al backend para obtener el PDF generado con Puppeteer
      this.saleNotesService.descargarPDF(note.id, estilo).subscribe({
        next: (pdfBlob: Blob) => {
          Sweetalert.fnc('close', '', null);

          const fileURL = URL.createObjectURL(pdfBlob);
          window.open(fileURL, '_blank');
        },
        error: (error) => {
          Sweetalert.fnc('error', 'Error al generar la vista previa.', null);
          console.error('Error generando PDF:', error);
        }
      });
    },
    error: (error) => {
      console.error('Error obteniendo configuración:', error);
      
      // Fallback: usar el diseño por defecto
      const estiloFallback = 'minimal';
      
      this.saleNotesService.descargarPDF(note.id, estiloFallback).subscribe({
        next: (pdfBlob: Blob) => {
          Sweetalert.fnc('close', '', null);
          const fileURL = URL.createObjectURL(pdfBlob);
          window.open(fileURL, '_blank');
        },
        error: (error) => {
          Sweetalert.fnc('error', 'Error al generar la vista previa.', null);
          console.error('Error generando PDF:', error);
        }
      });
    }
  });
}

/**
 * Descarga una nota como PDF usando el backend
 */
descargarPDF(note: SaleNote) {
  // Obtener la configuración de diseños del usuario
  this.designSettings.getUserDesignSettings().subscribe({
    next: (settings) => {
      // Para notas de venta, usar el diseño de notas de remisión
      let designId = settings.deliveryNoteDesignId || 'classic-delivery';
      
      // Extraer solo el nombre del estilo
      const estilo = designId.replace('-delivery', '');
      
      this.saleNotesService.descargarPDF(note.id, estilo).subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `nota_venta_${note.id.slice(0, 8)}_${new Date().toISOString().split('T')[0]}.pdf`;
          a.click();
          window.URL.revokeObjectURL(url);
        },
        error: (error) => {
          console.error('Error al descargar el PDF:', error);
          Sweetalert.fnc('error', 'Error al descargar el PDF', null);
        }
      });
    },
    error: (error) => {
      console.error('Error obteniendo configuración:', error);
      
      // Fallback: usar el diseño por defecto
      const estiloFallback = 'minimal';
      
      this.saleNotesService.descargarPDF(note.id, estiloFallback).subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `nota_venta_${note.id.slice(0, 8)}_${new Date().toISOString().split('T')[0]}.pdf`;
          a.click();
          window.URL.revokeObjectURL(url);
        },
        error: (error) => {
          console.error('Error al descargar el PDF:', error);
          Sweetalert.fnc('error', 'Error al descargar el PDF', null);
        }
      });
    }
  });
}

  /**
   * Eliminar una nota de venta
   */
  async eliminarNota(noteId: string) {
    const confirmed = await Sweetalert.confirmDelete(
      '¿Eliminar nota de venta?',
      'Esta acción no se puede deshacer'
    );

    if (confirmed) {
      this.loading = true;
      this.saleNotesService.delete(noteId).subscribe({
        next: () => {
          Sweetalert.fnc('success', 'Nota eliminada correctamente', null);
          this.loadNotes();
          this.loading = false;
        },
        error: (error) => {
          console.error('Error al eliminar la nota:', error);
          Sweetalert.fnc('error', 'Error al eliminar la nota: ' + this.getErrorMessage(error), null);
          this.loading = false;
        }
      });
    }
  }

  /**
   * Devuelve un objeto con la información de la empresa (mock)
   */
  private getCompanyInfo() {
    return {
      name: 'Mi Empresa S.A. de C.V.',
      rfc: 'MEX123456ABC',
      address: 'Calle Principal #123, Ciudad',
      logo: '/assets/images/logo.png'
    };
  }

/**
 * Exporta las notas de venta a formato CSV o Excel
 * @param format Formato de exportación ('csv' o 'xlsx')
 */
exportarNotas(format: string = 'xlsx') {
  if (this.dataSource.data.length === 0) {
    Sweetalert.fnc('info', 'No hay datos para exportar', null);
    return;
  }

  try {
    // Crear datos para exportar
    const data = this.dataSource.data.map(note => ({
      'Folio': note.folio,
      'Cliente': note.customerName || '',
      'RFC': note.customerRfc || '',
      'Fecha': note.saleDate ? new Date(note.saleDate).toLocaleString() : '',
      'Total': note.total || 0,
      'Método de Pago': note.paymentMethod || '',
      'Estado': this.getStatusText(note.status) || '',
      'Creado por': note.createdBy || '',
      'Fecha de Creación': note.createdAt ? new Date(note.createdAt).toLocaleString() : '',
      'Última Actualización': note.updatedAt ? new Date(note.updatedAt).toLocaleString() : ''
    }));

    // Crear el libro y hoja
    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(data);
    const workbook: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Notas de Venta');

    // Ajustar anchos de columna
    const columnsWidths = [
      { wch: 15 }, // ID Nota
      { wch: 30 }, // Cliente
      { wch: 15 }, // RFC
      { wch: 20 }, // Fecha
      { wch: 15 }, // Total
      { wch: 15 }, // Método de Pago
      { wch: 12 }, // Estado
      { wch: 20 }, // Creado por
      { wch: 20 }, // Fecha de Creación
      { wch: 20 }  // Última Actualización
    ];
    worksheet['!cols'] = columnsWidths;

    const fileName = `notas_de_venta_${new Date().toISOString().split('T')[0]}`;

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
   * Obtener el texto del estado
   */
  getStatusText(status: string): string {
    switch (status) {
      case 'COMPLETED':
        return 'Completada';
      case 'CANCELLED':
        return 'Cancelada';
      case 'PENDING':
        return 'Pendiente';
      default:
        return status;
    }
  }

  /**
   * Obtener la clase CSS para el estado
   */
  getStatusClass(status: string): string {
    switch (status) {
      case 'COMPLETED':
        return 'status-completed';
      case 'CANCELLED':
        return 'status-cancelled';
      case 'PENDING':
        return 'status-pending';
      default:
        return '';
    }
  }

  /**
   * Obtener la clase CSS para el estado en móvil
   */
  getStatusClassMobile(status: string): string {
    switch (status) {
      case 'COMPLETED':
        return 'completed';
      case 'CANCELLED':
        return 'cancelled';
      case 'PENDING':
        return 'pending';
      default:
        return '';
    }
  }
  
  /**
   * Obtener el color del estado para mat-chip
   */
  getStatusColor(status: string): string {
    switch(status) {
      case 'COMPLETED': return 'primary';
      case 'CANCELLED': return 'warn';
      default: return 'accent';
    }
  }
  
  /**
   * Obtener el icono para el método de pago
   */
  getPaymentMethodIcon(method: string): string {
    switch(method?.toUpperCase()) {
      case 'EFECTIVO': return 'payments';
      case 'TARJETA': return 'credit_card';
      case 'TRANSFERENCIA': return 'account_balance';
      case 'CHEQUE': return 'money';
      default: return 'paid';
    }
  }
  
  /**
   * Obtener la clase CSS para el método de pago
   */
  getPaymentMethodClass(method: string): string {
    switch(method?.toUpperCase()) {
      case 'EFECTIVO': return 'cash-payment';
      case 'TARJETA': return 'card-payment';
      case 'TRANSFERENCIA': return 'transfer-payment';
      case 'CHEQUE': return 'check-payment';
      default: return 'other-payment';
    }
  }
  /**
 * Enviar nota de venta por email
 */
enviarPorEmail(note: any): void {
  const dialogRef = this.dialog.open(SendEmailDialogComponent, {
    width: '500px',
    data: {
      noteId: note.id,
      customerName: note.customerName,
      defaultEmail: note.customerEmail || '' // Si tienes el email del cliente
    }
  });

  dialogRef.afterClosed().subscribe(result => {
    if (result) {
      // Mostrar loading
      const loadingSnack = this.snackBar.open('Enviando email...', '', {
        duration: 0
      });

      // Enviar email
      this.saleNotesService.sendNoteByEmail(note.id, result).subscribe({
        next: (response) => {
          loadingSnack.dismiss();
          this.snackBar.open(
            `✅ ${response.message || 'Email enviado exitosamente'}`, 
            'Cerrar', 
            { duration: 5000, panelClass: ['success-snackbar'] }
          );
        },
        error: (error) => {
          loadingSnack.dismiss();
          console.error('Error enviando email:', error);
          this.snackBar.open(
            `❌ Error al enviar email: ${error.error?.message || error.message}`, 
            'Cerrar', 
            { duration: 5000, panelClass: ['error-snackbar'] }
          );
        }
      });
    }
  });
}
  
  /**
   * Maneja los errores HTTP
   */
  private handleError(error: any) {
    console.error('Error en NotesComponent:', error);
    let errorMessage = 'Ocurrió un error al cargar las notas';
    
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