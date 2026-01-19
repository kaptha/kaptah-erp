import { Component, OnInit, ViewChild, AfterViewInit, HostListener } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { catchError, finalize } from 'rxjs/operators';
import { of } from 'rxjs';
import * as XLSX from 'xlsx';
import { DeliveryFormModalComponent } from './delivery-form-modal/delivery-form-modal.component';
import { DeliveryNote } from '../../../models/delivery.model';
import { DeliveryService } from '../../../services/ventas/delivery/delivery.service';
import { SendDeliveryDialogComponent } from './send-delivery-dialog/send-delivery-dialog.component';
import { DeliveryListComponent } from './delivery-list/delivery-list.component';
import { Sweetalert } from '../../../functions';

interface MobilePaginator {
  pageSize: number;
  pageIndex: number;
}

@Component({
    selector: 'app-delivery',
    templateUrl: './delivery.component.html',
    styleUrls: ['./delivery.component.css'],
    standalone: false
})
export class DeliveryComponent implements OnInit, AfterViewInit {
  // Propiedades del componente
  displayedColumns = ['folio', 'salesOrderId', 'deliveryDate', 'status', 'acciones'];
  dataSource = new MatTableDataSource<DeliveryNote>([]);
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
    private deliveryService: DeliveryService,
    private snackBar: MatSnackBar
  ) {
    this.checkScreenSize();
  }

  ngOnInit() {
    this.loadDeliveryNotes();
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
   * Carga las guías desde el servicio
   */
  loadDeliveryNotes() {
    this.loading = true;
    this.deliveryService.getAll().pipe(
      catchError((error) => {
        this.handleError(error);
        return of([]);
      }),
      finalize(() => {
        this.loading = false;
      })
    ).subscribe((deliveries) => {
      this.dataSource.data = deliveries;
      this.dataSource.filterPredicate = this.createFilter();
      
      // Resetear el paginador móvil
      this.mobilePaginator.pageIndex = 0;
    });
  }

  /**
   * Crea una función de filtro personalizada
   */
  createFilter(): (data: DeliveryNote, filter: string) => boolean {
    return (data: DeliveryNote, filter: string): boolean => {
      const searchTerms = filter.toLowerCase().split(' ');
      
      // Datos a buscar
      const searchableData = [
        data.folio?.toString() || '',
        data.salesOrderId?.toString() || '',
        this.getStatusText(data.status),
        data.deliveryDate?.toString() || ''
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
    
    
    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
    
    // Resetear el paginador móvil
    this.mobilePaginator.pageIndex = 0;
  }

  /**
   * Abre el diálogo para crear una nueva guía
   */
  agregarGuia() {
    const dialogRef = this.dialog.open(DeliveryFormModalComponent, {
      width: this.isMobile ? '95%' : '600px',
      data: null,
      disableClose: false
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loading = true;
        this.deliveryService.create(result).pipe(
          finalize(() => this.loading = false)
        ).subscribe({
          next: (response) => {
            Sweetalert.fnc('success', 'Guía creada correctamente', null);
            this.loadDeliveryNotes();
          },
          error: (error) => {
            console.error('Error al crear la guía:', error);
            Sweetalert.fnc('error', 'Error al crear la guía: ' + this.getErrorMessage(error), null);
          }
        });
      }
    });
  }

  /**
 * Ver detalles de una guía en un modal
 */
verDetalle(delivery: DeliveryNote) {
  this.dialog.open(DeliveryListComponent, {
    width: this.isMobile ? '95%' : '800px',
    maxWidth: '95vw',
    data: delivery,
    panelClass: 'delivery-detail-dialog'
  });
}

  
  /**
   * Editar una guía existente
   */
  editarGuia(delivery: DeliveryNote) {
     console.log('📝 Editando guía:', delivery);
  console.log('🆔 ID:', delivery.id);
  console.log('📋 Tipo:', typeof delivery.id);
    const dialogRef = this.dialog.open(DeliveryFormModalComponent, {
      width: this.isMobile ? '95%' : '600px',
      data: delivery,
      disableClose: false
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('📦 Datos del modal:', result);
      if (result) {
        this.loading = true;
        this.deliveryService.update(delivery.id, result).pipe(
          finalize(() => this.loading = false)
        ).subscribe({
          next: () => {
            Sweetalert.fnc('success', 'Guía actualizada correctamente', null);
            this.loadDeliveryNotes();
          },
          error: (error) => {
            console.error('Error al actualizar la guía:', error);
            Sweetalert.fnc('error', 'Error al actualizar la guía: ' + this.getErrorMessage(error), null);
          }
        });
      }
    });
  }

  /**
   * Eliminar una guía
   */
  async eliminarGuia(id: string) {
    const confirmed = await Sweetalert.confirmDelete(
      '¿Estás seguro?',
      `¿Quieres eliminar esta guía? Esta acción no se puede deshacer.`
    );

    if (confirmed) {
      this.loading = true;
      Sweetalert.fnc('loading', 'Procesando solicitud...', null);
      
      this.deliveryService.delete(id).pipe(
        finalize(() => this.loading = false)
      ).subscribe({
        next: () => {
          // Cerramos el SweetAlert de carga
          Sweetalert.fnc('close', '', null);
          this.loadDeliveryNotes();
          
          // Mostramos el SweetAlert de éxito
          setTimeout(() => {
            Sweetalert.fnc('success', 'La guía se eliminó correctamente', null);
          }, 100);
        },
        error: (error) => {
          console.error('Error al eliminar la guía:', error);
          Sweetalert.fnc('error', 'Error al eliminar la guía: ' + this.getErrorMessage(error), null);
        }
      });
    }
  }

  /**
 * Exporta las guías de remisión a formato CSV o Excel
 * @param format Formato de exportación ('csv' o 'xlsx')
 */
exportarGuias(format: string = 'xlsx') {
  if (this.dataSource.data.length === 0) {
    Sweetalert.fnc('info', 'No hay datos para exportar', null);
    return;
  }

  try {
    // Crear datos para exportar
    const data = this.dataSource.data.map(delivery => ({
      'Folio': delivery.folio || '',
      'ID Orden': delivery.salesOrderId ? delivery.salesOrderId.slice(0, 8) : '',
      'Fecha de Entrega': delivery.deliveryDate ? new Date(delivery.deliveryDate).toLocaleString() : '',
      'Estado': this.getStatusText(delivery.status) || '',
      'Creado por': delivery.createdBy || '',
      'Fecha de Creación': delivery.createdAt ? new Date(delivery.createdAt).toLocaleString() : '',
      'Última Actualización': delivery.updatedAt ? new Date(delivery.updatedAt).toLocaleString() : ''
    }));

    // Crear el libro y hoja
    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(data);
    const workbook: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Guías de Remisión');

    // Ajustar anchos de columna
    const columnsWidths = [
      { wch: 15 }, // Folio Guía
      { wch: 15 }, // ID Orden
      { wch: 20 }, // Fecha de Entrega
      { wch: 15 }, // Estado
      { wch: 20 }, // Creado por
      { wch: 20 }, // Fecha de Creación
      { wch: 20 }  // Última Actualización
    ];
    worksheet['!cols'] = columnsWidths;

    const fileName = `guias_de_remision_${new Date().toISOString().split('T')[0]}`;

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
 * Enviar guía de remisión por email
 */
enviarPorEmail(delivery: DeliveryNote): void {
  const dialogRef = this.dialog.open(SendDeliveryDialogComponent, {
    width: '500px',
    data: {
      deliveryNoteId: delivery.id,
      salesOrderId: delivery.salesOrderId,
      deliveryDate: delivery.deliveryDate,
      defaultEmail: '' // Aquí podrías poner el email del cliente si lo tienes
    }
  });

  dialogRef.afterClosed().subscribe(result => {
    if (result) {
      const loadingSnack = this.snackBar.open('Enviando guía de remisión...', '', {
        duration: 0
      });

      this.deliveryService.sendDeliveryNoteByEmail(delivery.id, result).subscribe({
        next: (response) => {
          loadingSnack.dismiss();
          
          Sweetalert.fnc('success', response.message || 'La guía de remisión se envió exitosamente', null);
        },
        error: (error) => {
          loadingSnack.dismiss();
          console.error('Error enviando guía:', error);
          
          Sweetalert.fnc('error', 'Error al enviar la guía: ' + this.getErrorMessage(error), null);
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
      case 'DELIVERED':
        return 'Entregado';
      case 'PENDING':
        return 'Pendiente';
      case 'TRANSIT':
        return 'En tránsito';
      case 'CANCELLED':
        return 'Cancelado';
      default:
        return status;
    }
  }

  /**
   * Obtener la clase CSS para el estado
   */
  getStatusClass(status: string): string {
    switch (status) {
      case 'DELIVERED':
        return 'status-delivered';
      case 'PENDING':
        return 'status-pending';
      case 'TRANSIT':
        return 'status-transit';
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
      case 'DELIVERED':
        return 'delivered';
      case 'PENDING':
        return 'pending';
      case 'TRANSIT':
        return 'transit';
      case 'CANCELLED':
        return 'cancelled';
      default:
        return '';
    }
  }

  /**
   * Obtener el color del estado para mat-chip
   */
  getStatusColor(status: string): string {
    switch(status) {
      case 'DELIVERED': return 'primary';
      case 'CANCELLED': return 'warn';
      case 'TRANSIT': return 'accent';
      default: return 'primary';
    }
  }

  /**
   * Maneja los errores HTTP
   */
  private handleError(error: any) {
    console.error('Error en DeliveryComponent:', error);
    let errorMessage = 'Ocurrió un error al cargar las guías';
    
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