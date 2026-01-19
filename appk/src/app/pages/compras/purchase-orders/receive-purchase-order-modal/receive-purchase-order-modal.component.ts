import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { PurchaseOrder, PurchaseOrderItem, PurchaseOrderService, ReceivePurchaseOrderDto } from '../../../../services/purchase-order.service';
import { ProductService } from '../../../../services/inventory/product.service';
import Swal from 'sweetalert2';

@Component({
    selector: 'app-receive-purchase-order-modal',
    templateUrl: './receive-purchase-order-modal.component.html',
    styleUrls: ['./receive-purchase-order-modal.component.css'],
    standalone: false
})
export class ReceivePurchaseOrderModalComponent implements OnInit {
  receiveForm!: FormGroup;
  order!: PurchaseOrder;
  loading = false;

  constructor(
    private fb: FormBuilder,
    private purchaseOrderService: PurchaseOrderService,
    private productService: ProductService,
    public dialogRef: MatDialogRef<ReceivePurchaseOrderModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { order: PurchaseOrder }
  ) {
    this.order = data.order;
  }

  ngOnInit(): void {
    this.initForm();
  }

  initForm(): void {
    this.receiveForm = this.fb.group({
      items: this.fb.array([]),
      notes: ['']
    });

    // Agregar un FormGroup por cada item de la orden
    this.order.items.forEach(item => {
      this.items.push(this.createItemGroup(item));
    });
  }

  get items(): FormArray {
    return this.receiveForm.get('items') as FormArray;
  }

  createItemGroup(item: PurchaseOrderItem): FormGroup {
    const quantityPending = item.quantity - (item.quantityReceived || 0);
    
    return this.fb.group({
      purchaseOrderItemId: [item.id],
      productName: [item.productName],
      productSku: [item.productSku],
      quantityOrdered: [item.quantity],
      quantityReceived: [item.quantityReceived || 0],
      quantityPending: [quantityPending],
      quantityToReceive: [
        quantityPending, 
        [
          Validators.required, 
          Validators.min(0), 
          Validators.max(quantityPending)
        ]
      ],
      unitCost: [item.unitCost],
      notes: ['']
    });
  }

  getItemAt(index: number): FormGroup {
    return this.items.at(index) as FormGroup;
  }

  /**
   * Validar que al menos un item tenga cantidad > 0
   */
  hasQuantityToReceive(): boolean {
    return this.items.controls.some(item => {
      const qty = item.get('quantityToReceive')?.value || 0;
      return qty > 0;
    });
  }

  /**
   * Calcular totales de lo que se va a recibir
   */
  calculateReceivingTotals(): { items: number; quantity: number; amount: number } {
    let totalItems = 0;
    let totalQuantity = 0;
    let totalAmount = 0;

    this.items.controls.forEach(item => {
      const qtyToReceive = item.get('quantityToReceive')?.value || 0;
      const unitCost = item.get('unitCost')?.value || 0;

      if (qtyToReceive > 0) {
        totalItems++;
        totalQuantity += qtyToReceive;
        totalAmount += qtyToReceive * unitCost;
      }
    });

    return {
      items: totalItems,
      quantity: totalQuantity,
      amount: totalAmount
    };
  }

  /**
   * Marcar todos los items como recibidos completos
   */
  receiveAll(): void {
    this.items.controls.forEach((item, index) => {
      const pending = item.get('quantityPending')?.value || 0;
      item.patchValue({
        quantityToReceive: pending
      });
    });
  }

  /**
   * Limpiar todas las cantidades a recibir
   */
  clearAll(): void {
    this.items.controls.forEach(item => {
      item.patchValue({
        quantityToReceive: 0
      });
    });
  }

  onSubmit(): void {
    if (this.receiveForm.invalid) {
      Swal.fire({
        icon: 'error',
        title: 'Formulario inválido',
        text: 'Por favor verifica las cantidades ingresadas',
        confirmButtonText: 'Aceptar'
      });
      this.markFormGroupTouched(this.receiveForm);
      return;
    }

    if (!this.hasQuantityToReceive()) {
      Swal.fire({
        icon: 'warning',
        title: 'Sin cantidades a recibir',
        text: 'Debes ingresar al menos una cantidad mayor a 0 para recibir',
        confirmButtonText: 'Aceptar'
      });
      return;
    }

    const totals = this.calculateReceivingTotals();

    Swal.fire({
      title: '¿Confirmar recepción de mercancía?',
      html: `
        <div style="text-align: left; padding: 10px;">
          <p><strong>Orden:</strong> ${this.order.orderNumber}</p>
          <p><strong>Proveedor:</strong> ${this.order.supplierName}</p>
          <hr>
          <p><strong>Productos a recibir:</strong> ${totals.items}</p>
          <p><strong>Cantidad total:</strong> ${totals.quantity} unidades</p>
          <p><strong>Monto:</strong> $${totals.amount.toFixed(2)}</p>
          <hr>
          <p style="color: #666; font-size: 0.9em;">
            Esta acción actualizará el inventario de los productos recibidos.
          </p>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, recibir mercancía',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.processReceive();
      }
    });
  }

  private processReceive(): void {
    this.loading = true;

    const receiveDto: ReceivePurchaseOrderDto = {
      items: this.items.controls
        .filter(item => {
          const qty = item.get('quantityToReceive')?.value || 0;
          return qty > 0;
        })
        .map(item => ({
          purchaseOrderItemId: item.get('purchaseOrderItemId')?.value,
          quantityReceived: item.get('quantityToReceive')?.value,
          notes: item.get('notes')?.value || undefined
        })),
      notes: this.receiveForm.get('notes')?.value || undefined
    };

    if (!this.order.id) {
      this.loading = false;
      Swal.fire('Error', 'ID de orden no válido', 'error');
      return;
    }

    this.purchaseOrderService.receiveOrder(this.order.id, receiveDto).subscribe({
      next: (updatedOrder) => {
        this.loading = false;
        
        // Actualizar inventario de productos
        this.updateProductInventory(receiveDto).then(() => {
          Swal.fire({
            icon: 'success',
            title: 'Mercancía recibida',
            html: `
              <p>La mercancía ha sido recibida correctamente.</p>
              <p><strong>Nuevo estado:</strong> ${this.getStatusText(updatedOrder.status)}</p>
            `,
            confirmButtonText: 'Aceptar'
          });
          this.dialogRef.close(updatedOrder);
        }).catch(error => {
          console.error('Error al actualizar inventario:', error);
          Swal.fire({
            icon: 'warning',
            title: 'Recepción parcial',
            text: 'La orden fue actualizada pero hubo un error al actualizar el inventario. Verifica manualmente.',
            confirmButtonText: 'Aceptar'
          });
          this.dialogRef.close(updatedOrder);
        });
      },
      error: (error) => {
        this.loading = false;
        console.error('Error al recibir mercancía:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error al recibir mercancía',
          text: error.message || 'No se pudo procesar la recepción',
          confirmButtonText: 'Aceptar'
        });
      }
    });
  }

  /**
   * Actualizar inventario de productos recibidos
   */
  private async updateProductInventory(receiveDto: ReceivePurchaseOrderDto): Promise<void> {
    const updatePromises = receiveDto.items.map(async (item) => {
      // Encontrar el item original para obtener el productId
      const originalItem = this.order.items.find(i => i.id === item.purchaseOrderItemId);
      
      if (!originalItem) {
        console.error(`No se encontró item con ID ${item.purchaseOrderItemId}`);
        return;
      }

      try {
        console.log(`Actualizando stock de producto ${originalItem.productId}: +${item.quantityReceived} unidades`);

        // Usar el método específico de actualización de stock
        // El backend suma automáticamente la cantidad al stock actual
        await this.productService.updateStock(originalItem.productId, item.quantityReceived).toPromise();

        console.log(`Stock actualizado exitosamente para producto ${originalItem.productId}`);
      } catch (error) {
        console.error(`Error al actualizar stock del producto ${originalItem.productId}:`, error);
        throw error;
      }
    });

    await Promise.all(updatePromises);
  }

  private markFormGroupTouched(formGroup: FormGroup | FormArray): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();

      if (control instanceof FormGroup || control instanceof FormArray) {
        this.markFormGroupTouched(control);
      }
    });
  }

  private getStatusText(status: string): string {
    const statusTexts: any = {
      'DRAFT': 'Borrador',
      'SENT': 'Enviada',
      'PARTIAL': 'Parcialmente Recibida',
      'RECEIVED': 'Completamente Recibida',
      'CANCELLED': 'Cancelada'
    };
    return statusTexts[status] || status;
  }

  onClose(): void {
    if (this.hasQuantityToReceive()) {
      Swal.fire({
        title: '¿Cancelar recepción?',
        text: 'Hay cantidades pendientes de recibir. ¿Estás seguro de cancelar?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Sí, cancelar',
        cancelButtonText: 'Continuar recibiendo'
      }).then((result) => {
        if (result.isConfirmed) {
          this.dialogRef.close();
        }
      });
    } else {
      this.dialogRef.close();
    }
  }
}