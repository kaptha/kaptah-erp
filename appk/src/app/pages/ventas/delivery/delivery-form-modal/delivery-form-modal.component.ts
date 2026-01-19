import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { SucursalesService } from '../../../../services/sucursales.service';
import { SalesOrdersService } from '../../../../services/ventas/orders/order.service';
import { ProductService } from '../../../../services/inventory/product.service';
import { Sucursal } from '../../../../models/sucursal.model';
import { SalesOrder } from '../../../../models/sales-order.model';

@Component({
    selector: 'app-delivery-form-modal',
    templateUrl: './delivery-form-modal.component.html',
    styleUrls: ['./delivery-form-modal.component.css'],
    standalone: false
})
export class DeliveryFormModalComponent implements OnInit {
  deliveryForm!: FormGroup;
  sucursales: Sucursal[] = [];
  salesOrders: SalesOrder[] = []; // ✨ NUEVO
  products: any[] = []; // ✅ AGREGADO: Lista de productos
  loadingSucursales: boolean = false;
  loadingSalesOrders: boolean = false; // ✨ NUEVO
  selectedSucursal: Sucursal | null = null;
  selectedSalesOrder: SalesOrder | null = null; // ✨ NUEVO

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<DeliveryFormModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private sucursalesService: SucursalesService,
    private salesOrdersService: SalesOrdersService,
    private productService: ProductService
  ) {
    this.createForm();
  }

  ngOnInit() {
    this.loadSucursales();
    this.loadSalesOrders(); // ✨ NUEVO
    this.loadProducts(); // ✅ AGREGADO
    
    if (this.data) {
      console.log('🔄 Modal en MODO EDICIÓN');
      console.log('📦 Data recibida:', this.data);
      this.patchForm(this.data);
      
      // Debug: Verificar estado del formulario después de patchear
      setTimeout(() => {
        console.log('✅ Estado del formulario después de patch:');
        console.log('  - Válido:', this.deliveryForm.valid);
        console.log('  - Errores:', this.getFormValidationErrors());
      }, 100);
    }
  }

  // ✅ AGREGADO: Método para debugging de validaciones
  getFormValidationErrors() {
    const errors: any = {};
    Object.keys(this.deliveryForm.controls).forEach(key => {
      const controlErrors = this.deliveryForm.get(key)?.errors;
      if (controlErrors) {
        errors[key] = controlErrors;
      }
    });
    
    // Verificar errores en items
    this.items.controls.forEach((item, index) => {
      const itemErrors: any = {};
      Object.keys((item as FormGroup).controls).forEach(key => {
        const controlErrors = item.get(key)?.errors;
        if (controlErrors) {
          itemErrors[key] = controlErrors;
        }
      });
      if (Object.keys(itemErrors).length > 0) {
        errors[`item_${index}`] = itemErrors;
      }
    });
    
    return errors;
  }

  createForm() {
    this.deliveryForm = this.fb.group({
      salesOrderId: ['', Validators.required],
      sucursalId: [''],
      deliveryDate: [new Date(), Validators.required],
      status: ['PENDING', Validators.required],
      notes: [''],
      items: this.fb.array([]) // ✨ FormArray para items
    });
  }

  // ✨ Getter para acceder al FormArray de items
  get items(): FormArray {
    return this.deliveryForm.get('items') as FormArray;
  }

  // ✨ NUEVO: Cargar órdenes de venta
  loadSalesOrders(): void {
    this.loadingSalesOrders = true;
    this.salesOrdersService.getAll().subscribe({
      next: (orders) => {
        // Filtrar solo órdenes que no estén canceladas
        this.salesOrders = orders.filter(order => order.status !== 'CANCELLED');
        this.loadingSalesOrders = false;
      },
      error: (error) => {
        console.error('Error al cargar órdenes de venta:', error);
        this.loadingSalesOrders = false;
      }
    });
  }

  // ✅ AGREGADO: Cargar productos
  loadProducts(): void {
    this.productService.getProducts().subscribe({
      next: (products) => {
        this.products = products;
        console.log('📦 Productos cargados:', products.length);
      },
      error: (error) => {
        console.error('❌ Error al cargar productos:', error);
      }
    });
  }

  // ✅ AGREGADO: Obtener información del producto
  getProductInfo(productId: string | number): any {
    const id = typeof productId === 'string' ? parseInt(productId, 10) : productId;
    return this.products.find(p => p.id === id);
  }

  // ✅ MODIFICADO: Manejar selección de orden de venta con datos reales del producto
  onSalesOrderSelect(event: any): void {
    const orderId = event.value;
    
    if (orderId) {
      const order = this.salesOrders.find(o => o.id === orderId);
      this.selectedSalesOrder = order || null;
      
      // Si la orden tiene items, cargarlos automáticamente
      if (order && order.items && order.items.length > 0) {
        this.items.clear();
        
        order.items.forEach(item => {
          // ✅ Buscar el producto en la lista cargada para obtener el nombre real
          const product = this.getProductInfo(item.productId);
          
          this.items.push(this.createItemFormGroup({
            productId: item.productId || '',
            description: product?.name || product?.description || item.description || 'Producto',
            quantity: item.quantity || 0,
            deliveredQuantity: 0 // Inicialmente 0
          }));
        });
      }
      
      console.log('Orden seleccionada:', this.selectedSalesOrder);
    } else {
      this.selectedSalesOrder = null;
      this.items.clear();
    }
  }

  // ✨ Cargar sucursales
  loadSucursales(): void {
    this.loadingSucursales = true;
    this.sucursalesService.getSucursales().subscribe({
      next: (sucursales) => {
        this.sucursales = sucursales;
        this.loadingSucursales = false;
      },
      error: (error) => {
        console.error('Error al cargar sucursales:', error);
        this.loadingSucursales = false;
      }
    });
  }

  // ✨ Manejar selección de sucursal
  onSucursalSelect(event: any): void {
    const sucursalId = event.value;
    
    if (sucursalId) {
      const sucursal = this.sucursales.find(s => s.id === sucursalId);
      this.selectedSucursal = sucursal || null;
      
      this.deliveryForm.patchValue({
        sucursalId: sucursalId
      });
      
      console.log('Sucursal seleccionada:', this.selectedSucursal);
    } else {
      this.selectedSucursal = null;
      this.deliveryForm.patchValue({
        sucursalId: null
      });
    }
  }

  // ✨ NUEVO: Crear FormGroup para un item
  createItemFormGroup(item?: any): FormGroup {
    return this.fb.group({
      productId: [item?.productId || '', Validators.required],
      description: [item?.description || ''],
      quantity: [item?.quantity || 0, [Validators.required, Validators.min(1)]],
      deliveredQuantity: [item?.deliveredQuantity || 0, [Validators.required, Validators.min(0)]]
    });
  }

  // ✨ NUEVO: Agregar item
  addItem(): void {
    this.items.push(this.createItemFormGroup());
  }

  // ✨ NUEVO: Remover item
  removeItem(index: number): void {
    this.items.removeAt(index);
  }

  patchForm(data: any) {
    if (!data) return;

    this.deliveryForm.patchValue({
      salesOrderId: data.salesOrderId || '',
      sucursalId: data.sucursalId || null,
      deliveryDate: data.deliveryDate ? new Date(data.deliveryDate) : new Date(),
      status: data.status || 'PENDING',
      notes: data.notes || ''
    });

    // Cargar items si existen
    if (data.items && data.items.length > 0) {
      this.items.clear();
      data.items.forEach((item: any) => {
        this.items.push(this.createItemFormGroup(item));
      });
    }

    // Si tiene sucursal, actualizar la selección
    if (data.sucursalId) {
      const sucursal = this.sucursales.find(s => s.id === data.sucursalId);
      this.selectedSucursal = sucursal || null;
    }

    // Si tiene orden, actualizar la selección
    if (data.salesOrderId) {
      const order = this.salesOrders.find(o => o.id === data.salesOrderId);
      this.selectedSalesOrder = order || null;
    }
  }

  onSubmit(): void {
    if (this.deliveryForm.valid) {
      const formValue = this.deliveryForm.value;
      
      console.log('📋 Modo del formulario:', this.data ? 'EDICIÓN' : 'CREACIÓN');
      console.log('📦 Data recibida en el modal:', this.data);
      console.log('🆔 ID presente:', this.data?.id);
      
      // ✅ TRANSFORMAR: Convertir productId a string y agregar deliveredQuantity inicial
      const transformedItems = formValue.items.map((item: any) => ({
        productId: String(item.productId),
        description: item.description,
        quantity: item.quantity,
        deliveredQuantity: item.deliveredQuantity || 0
      }));
      
      // Verificar si estamos en modo edición
      const isEditMode = this.data && this.data.id;
      
      if (isEditMode) {
        // ✅ MODO EDICIÓN: Preparar datos para actualizar
        const updatePayload = {
          items: transformedItems
          // ❌ NO enviar status - el backend lo calculará automáticamente
        };
        
        console.log('🔄 Cerrando modal con datos de actualización:', updatePayload);
        this.dialogRef.close(updatePayload);
      } else {
        // ✅ MODO CREACIÓN: Preparar datos para crear
        const createPayload = {
          salesOrderId: formValue.salesOrderId,
          sucursalId: formValue.sucursalId,
          items: transformedItems
        };
        
        console.log('✅ Cerrando modal con datos de creación:', createPayload);
        this.dialogRef.close(createPayload);
      }
    } else {
      console.warn('⚠️ Formulario inválido');
      // Marcar todos los campos como touched para mostrar errores
      Object.keys(this.deliveryForm.controls).forEach(key => {
        this.deliveryForm.get(key)?.markAsTouched();
      });
      
      // También marcar items
      this.items.controls.forEach(item => {
        Object.keys((item as FormGroup).controls).forEach(key => {
          item.get(key)?.markAsTouched();
        });
      });
      
      console.warn('⚠️ Formulario inválido');
    }
  }

  onClose(): void {
    this.dialogRef.close();
  }
}