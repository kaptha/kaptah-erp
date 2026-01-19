import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { DeliveryNote } from '../../../../models/delivery.model';

@Component({
    selector: 'app-delivery-list',
    templateUrl: './delivery-list.component.html',
    styleUrls: ['./delivery-list.component.css'],
    standalone: false
})
export class DeliveryListComponent {
  constructor(
    public dialogRef: MatDialogRef<DeliveryListComponent>,
    @Inject(MAT_DIALOG_DATA) public delivery: DeliveryNote
  ) {}

  /**
   * Cerrar el modal
   */
  onClose(): void {
    this.dialogRef.close();
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
   * Calcular porcentaje de entrega
   */
  getDeliveryPercentage(item: any): number {
    if (!item.quantity || item.quantity === 0) return 0;
    const delivered = item.deliveredQuantity || 0;
    return Math.round((delivered / item.quantity) * 100);
  }

  /**
   * Verificar si el item está completamente entregado
   */
  isItemFullyDelivered(item: any): boolean {
    return (item.deliveredQuantity || 0) >= item.quantity;
  }

  /**
   * Verificar si el item tiene entrega parcial
   */
  isItemPartiallyDelivered(item: any): boolean {
    const delivered = item.deliveredQuantity || 0;
    return delivered > 0 && delivered < item.quantity;
  }
}
