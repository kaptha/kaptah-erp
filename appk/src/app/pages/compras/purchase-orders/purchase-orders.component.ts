import { Component, OnInit, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SendPurchaseOrderDialogComponent } from './send-purchase-order-dialog/send-purchase-order-dialog.component';
import { PurchaseOrder, PurchaseOrderService } from '../../../services/purchase-order.service';
import { PurchaseOrderFormModalComponent } from './purchase-order-form-modal/purchase-order-form-modal.component';
import { ReceivePurchaseOrderModalComponent } from './receive-purchase-order-modal/receive-purchase-order-modal.component';
import { DesignSettingsService } from '../../../services/design-settings.service';
import { Sweetalert } from '../../../functions';
import Swal from 'sweetalert2';

@Component({
    selector: 'app-purchase-orders',
    templateUrl: './purchase-orders.component.html',
    styleUrls: ['./purchase-orders.component.css'],
    standalone: false
})
export class PurchaseOrdersComponent implements OnInit {
  displayedColumns: string[] = ['orderNumber', 'supplierName', 'orderDate', 'total', 'status', 'actions'];
  dataSource!: MatTableDataSource<PurchaseOrder>;
  loading = false;

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private purchaseOrderService: PurchaseOrderService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private designSettings: DesignSettingsService // 🆕 Inyectar servicio de diseños
  ) {
    this.dataSource = new MatTableDataSource<PurchaseOrder>([]);
  }

  ngOnInit(): void {
    this.loadPurchaseOrders();
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  loadPurchaseOrders(): void {
    this.loading = true;
    this.purchaseOrderService.getAll().subscribe({
      next: (orders) => {
        console.log('Órdenes cargadas:', orders);
        this.dataSource.data = orders;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error al cargar órdenes:', error);
        this.loading = false;
        Swal.fire({
          icon: 'error',
          title: 'Error al cargar órdenes',
          text: error.message || 'No se pudieron cargar las órdenes de compra',
          confirmButtonText: 'Aceptar'
        });
      }
    });
  }

  applyFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }

  agregarOrden(): void {
    const dialogRef = this.dialog.open(PurchaseOrderFormModalComponent, {
      width: '90%',
      maxWidth: '1200px',
      data: { isEditMode: false }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadPurchaseOrders();
      }
    });
  }

  editarOrden(order: PurchaseOrder): void {
    if (order.status !== 'DRAFT') {
      Swal.fire({
        icon: 'warning',
        title: 'Aviso',
        text: 'Solo se pueden editar órdenes en estado BORRADOR',
        confirmButtonText: 'Aceptar'
      });
      return;
    }

    const dialogRef = this.dialog.open(PurchaseOrderFormModalComponent, {
      width: '90%',
      maxWidth: '1200px',
      data: { isEditMode: true, order }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadPurchaseOrders();
      }
    });
  }

  /**
   * 🆕 Ver detalle de orden de compra con PDF generado por backend
   */
  verDetalleBackend(order: PurchaseOrder): void {
    if (!order.id) {
      Sweetalert.fnc('error', 'ID de orden no válido', null);
      return;
    }

    Sweetalert.fnc('loading', 'Generando vista previa...', null);

    // Obtener el diseño seleccionado
    this.designSettings.getUserDesignSettings().subscribe({
      next: (settings) => {
        // Para órdenes de compra, intentar usar el diseño de purchase orders
        // Si no existe, usar el de cotizaciones o un diseño por defecto
        let designId = (settings as any).purchaseOrderDesignId || settings.quoteDesignId || 'classic';
        
        // Extraer solo el nombre del estilo (quitar sufijos)
        const estilo = designId.replace('-purchase-order', '').replace('-quote', '');
        
        console.log('🎨 Diseño completo:', designId);
        console.log('🎨 Estilo para template:', estilo);
        
        // Llamar al backend para obtener el PDF generado con Puppeteer
        this.purchaseOrderService.descargarPDF(order.id!, estilo).subscribe({
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
        
        this.purchaseOrderService.descargarPDF(order.id!, estiloFallback).subscribe({
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
   * 🆕 Descarga una orden de compra como PDF usando el backend
   */
  descargarPDFBackend(order: PurchaseOrder): void {
    if (!order.id) {
      Sweetalert.fnc('error', 'ID de orden no válido', null);
      return;
    }

    // Obtener la configuración de diseños del usuario
    this.designSettings.getUserDesignSettings().subscribe({
      next: (settings) => {
        // Para órdenes de compra, intentar usar el diseño de purchase orders
        let designId = (settings as any).purchaseOrderDesignId || settings.quoteDesignId || 'classic';
        
        // Extraer solo el nombre del estilo
        const estilo = designId.replace('-purchase-order', '').replace('-quote', '');
        
        this.purchaseOrderService.descargarPDF(order.id!, estilo).subscribe({
          next: (blob) => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `orden_compra_${order.orderNumber}_${new Date().toISOString().split('T')[0]}.pdf`;
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
        Sweetalert.fnc('error', 'Error al obtener configuración', null);
      }
    });
  }

  /**
   * 🔄 Versión antigua - Ver detalle en modal (mantener si es necesario)
   */
  verDetalle(order: PurchaseOrder): void {
    this.dialog.open(PurchaseOrderFormModalComponent, {
      width: '90%',
      maxWidth: '1200px',
      data: { isEditMode: false, order, viewMode: true }
    });
  }

  eliminarOrden(order: PurchaseOrder): void {
    if (order.status !== 'DRAFT') {
      Swal.fire({
        icon: 'warning',
        title: 'Aviso',
        text: 'Solo se pueden eliminar órdenes en estado BORRADOR',
        confirmButtonText: 'Aceptar'
      });
      return;
    }

    Swal.fire({
      title: '¿Eliminar orden?',
      text: `¿Está seguro de eliminar la orden ${order.orderNumber}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed && order.id) {
        this.purchaseOrderService.delete(order.id).subscribe({
          next: () => {
            Swal.fire('Eliminada', 'La orden ha sido eliminada correctamente', 'success');
            this.loadPurchaseOrders();
          },
          error: (error) => {
            console.error('Error al eliminar orden:', error);
            Swal.fire('Error', error.message || 'No se pudo eliminar la orden', 'error');
          }
        });
      }
    });
  }

  cambiarEstado(order: PurchaseOrder, nuevoEstado: string): void {
    if (!order.id) return;

    Swal.fire({
      title: '¿Cambiar estado?',
      text: `¿Cambiar el estado de la orden a ${this.getStatusText(nuevoEstado)}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, cambiar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed && order.id) {
        this.purchaseOrderService.changeStatus(order.id, nuevoEstado).subscribe({
          next: () => {
            Swal.fire('Actualizado', 'El estado ha sido cambiado correctamente', 'success');
            this.loadPurchaseOrders();
          },
          error: (error) => {
            console.error('Error al cambiar estado:', error);
            Swal.fire('Error', error.message || 'No se pudo cambiar el estado', 'error');
          }
        });
      }
    });
  }

  recibirMercancia(order: PurchaseOrder): void {
    if (order.status !== 'SENT' && order.status !== 'PARTIAL') {
      Swal.fire({
        icon: 'warning',
        title: 'Aviso',
        text: 'Solo se puede recibir mercancía de órdenes ENVIADAS o PARCIALES',
        confirmButtonText: 'Aceptar'
      });
      return;
    }

    const dialogRef = this.dialog.open(ReceivePurchaseOrderModalComponent, {
      width: '90%',
      maxWidth: '1000px',
      disableClose: true,
      data: { order }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadPurchaseOrders();
      }
    });
  }

  getStatusClass(status: string): string {
    const statusClasses: any = {
      'DRAFT': 'status-draft',
      'SENT': 'status-sent',
      'PARTIAL': 'status-partial',
      'RECEIVED': 'status-received',
      'CANCELLED': 'status-cancelled'
    };
    return statusClasses[status] || '';
  }

  getStatusText(status: string): string {
    const statusTexts: any = {
      'DRAFT': 'Borrador',
      'SENT': 'Enviada',
      'PARTIAL': 'Parcial',
      'RECEIVED': 'Recibida',
      'CANCELLED': 'Cancelada'
    };
    return statusTexts[status] || status;
  }

  /**
   * Enviar orden de compra por email
   */
  enviarPorEmail(order: PurchaseOrder): void {
    if (!order.id) return;

    const dialogRef = this.dialog.open(SendPurchaseOrderDialogComponent, {
      width: '500px',
      data: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        supplierName: order.supplierName,
        total: order.total,
        currency: order.currency || 'MXN',
        expectedDate: order.expectedDate,
        defaultEmail: ''
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && order.id) {
        const loadingSnack = this.snackBar.open('Enviando orden de compra...', '', {
          duration: 0
        });

        this.purchaseOrderService.sendPurchaseOrderByEmail(order.id, result).subscribe({
          next: (response) => {
            loadingSnack.dismiss();
            
            Swal.fire({
              icon: 'success',
              title: '¡Orden Enviada!',
              text: response.message || 'La orden de compra se envió exitosamente al proveedor',
              confirmButtonColor: '#7F3FF0',
            });
          },
          error: (error) => {
            loadingSnack.dismiss();
            console.error('Error enviando orden:', error);
            
            Swal.fire({
              icon: 'error',
              title: 'Error al Enviar',
              text: error.message || 'No se pudo enviar la orden de compra',
              confirmButtonColor: '#7F3FF0',
            });
          }
        });
      }
    });
  }
}