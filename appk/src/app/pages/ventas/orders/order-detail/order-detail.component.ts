import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { SalesOrder } from '../../../../models/sales-order.model';
import { ProductService } from '../../../../services/inventory/product.service';

@Component({
    selector: 'app-order-detail',
    templateUrl: './order-detail.component.html',
    styleUrls: ['./order-detail.component.css'],
    standalone: false
})
export class OrderDetailComponent implements OnInit {
  displayedColumns: string[] = ['product', 'quantity', 'unitPrice', 'subtotal', 'tax', 'total'];
  productNames: { [key: string]: string } = {};

  constructor(
    public dialogRef: MatDialogRef<OrderDetailComponent>,
    @Inject(MAT_DIALOG_DATA) public order: SalesOrder,
    private productService: ProductService
  ) {}

  ngOnInit(): void {
    this.loadProductNames();
  }

  /**
   * Cargar nombres de productos desde el servicio
   */
  loadProductNames(): void {
    this.productService.getProducts().subscribe({
      next: (products) => {
        products.forEach(product => {
          this.productNames[product.id] = product.name || product.description;
        });
      },
      error: (error) => {
        console.error('Error cargando productos:', error);
      }
    });
  }

  /**
   * Obtener nombre del producto por ID
   */
  getProductName(productId: string): string {
    return this.productNames[productId] || `Producto ID: ${productId}`;
  }

  /**
   * Cerrar el modal
   */
  onClose(): void {
    this.dialogRef.close();
  }

  /**
   * Crear Nota de Venta desde esta orden
   */
  crearNotaDeVenta(): void {
    // Verificar que la orden esté aprobada
    if (this.order.status !== 'APPROVED') {
      return;
    }
    
    this.dialogRef.close({ 
      action: 'createSaleNote', 
      order: this.order 
    });
  }

  /**
   * Verificar si se puede crear nota de venta
   */
  canCreateSaleNote(): boolean {
    return this.order.status === 'APPROVED';
  }

  /**
   * Obtener el texto del estado
   */
  getStatusText(status: string): string {
    switch (status) {
      case 'PENDING':
        return 'Pendiente';
      case 'APPROVED':
        return 'Aprobada';
      case 'DELIVERED':
        return 'Entregada';
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
      case 'APPROVED':
        return 'status-approved';
      case 'PENDING':
        return 'status-pending';
      case 'DELIVERED':
        return 'status-delivered';
      case 'CANCELLED':
        return 'status-cancelled';
      default:
        return '';
    }
  }

  /**
   * Formatear moneda
   */
  formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(value);
  }
}
