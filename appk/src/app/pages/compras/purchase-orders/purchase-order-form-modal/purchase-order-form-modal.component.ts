import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators, FormControl } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ReplaySubject, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import Swal from 'sweetalert2';
import { PurchaseOrder, PurchaseOrderService, CreatePurchaseOrderDto } from '../../../../services/purchase-order.service';
import { ApibizService } from '../../../../services/apibiz.service';
import { ProductService } from '../../../../services/inventory/product.service';
import { Proveedor } from '../../../../models/proveedor.model';
import { Product } from '../../../../pages/productos/interfaces/product.interface';

// Interfaz local para Supplier (simplificada del modelo Proveedor)
interface Supplier {
  id: number;
  nombre: string;
  rfc?: string;
  direccion?: string;
}

@Component({
    selector: 'app-purchase-order-form-modal',
    templateUrl: './purchase-order-form-modal.component.html',
    styleUrls: ['./purchase-order-form-modal.component.css'],
    standalone: false
})
export class PurchaseOrderFormModalComponent implements OnInit {
  orderForm!: FormGroup;
  isEditMode = false;
  viewMode = false;
  loading = false;
  loadingSuppliers = false;
  loadingProducts = false;

  // Datos para selects
  suppliers: Supplier[] = [];
  products: Product[] = [];
  
  // Proveedor seleccionado
  selectedSupplier: Supplier | null = null;

  // Filtros para búsqueda
  supplierFilterCtrl = new FormControl('');
  productFilterCtrl = new FormControl('');
  
  // Subjects para filtrado
  filteredSuppliers = new ReplaySubject<Supplier[]>(1);
  filteredProducts: ReplaySubject<Product[]>[] = [];
  
  protected _onDestroy = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private purchaseOrderService: PurchaseOrderService,
    private apibizService: ApibizService,
    private productService: ProductService,
    public dialogRef: MatDialogRef<PurchaseOrderFormModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.isEditMode = data?.isEditMode || false;
    this.viewMode = data?.viewMode || false;
  }

  ngOnInit(): void {
    this.initForm();
    this.loadSuppliers();
    this.loadProducts();
    this.setupFilters();

    if (this.data?.order) {
      this.loadOrderData(this.data.order);
    } else {
      // Agregar un item por defecto
      this.addItem();
    }

    if (this.viewMode) {
      this.orderForm.disable();
    }
  }

  ngOnDestroy() {
    this._onDestroy.next();
    this._onDestroy.complete();
  }

  initForm(): void {
    this.orderForm = this.fb.group({
      supplierId: ['', Validators.required],
      supplierName: [''],
      orderDate: [new Date(), Validators.required],
      expectedDate: [''],
      currency: ['MXN', Validators.required],
      notes: [''],
      items: this.fb.array([]),
      subtotal: [0],
      tax: [0],
      total: [0]
    });
  }

  get items(): FormArray {
    return this.orderForm.get('items') as FormArray;
  }

  createItem(item?: any): FormGroup {
    const itemGroup = this.fb.group({
      productId: [item?.productId || '', Validators.required],
      productName: [item?.productName || ''],
      productSku: [item?.productSku || ''],
      quantity: [item?.quantity || 1, [Validators.required, Validators.min(1)]],
      unitCost: [item?.unitCost || 0, [Validators.required, Validators.min(0)]],
      taxRate: [item?.taxRate || 16, [Validators.required, Validators.min(0)]],
      subtotal: [item?.subtotal || 0],
      taxAmount: [item?.taxAmount || 0],
      total: [item?.total || 0],
      notes: [item?.notes || '']
    });

    // Configurar filtro para este item
    this.filteredProducts.push(new ReplaySubject<Product[]>(1));
    this.filteredProducts[this.filteredProducts.length - 1].next(this.products.slice());

    return itemGroup;
  }

  addItem(): void {
    this.items.push(this.createItem());
  }

  removeItem(index: number): void {
    if (this.items.length > 1) {
      this.items.removeAt(index);
      this.filteredProducts.splice(index, 1);
      this.calculateOrderTotals();
    } else {
      Swal.fire('Aviso', 'Debe haber al menos un producto', 'warning');
    }
  }

  loadOrderData(order: PurchaseOrder): void {
    this.orderForm.patchValue({
      supplierId: order.supplierId,
      supplierName: order.supplierName,
      orderDate: order.orderDate,
      expectedDate: order.expectedDate,
      currency: order.currency,
      notes: order.notes,
      subtotal: order.subtotal,
      tax: order.tax,
      total: order.total
    });

    // Limpiar items existentes
    while (this.items.length) {
      this.items.removeAt(0);
    }

    // Agregar items de la orden
    order.items.forEach(item => {
      this.items.push(this.createItem(item));
    });

    // Cargar proveedor seleccionado si existe
    if (order.supplierId) {
      this.selectedSupplier = this.suppliers.find(s => s.id === order.supplierId) || null;
    }
  }

  loadSuppliers(): void {
    this.loadingSuppliers = true;
    
    this.apibizService.getProveedores().subscribe({
      next: (proveedores: Proveedor[]) => {
        console.log('Proveedores cargados:', proveedores);
        
        // Mapear Proveedor[] a Supplier[] (filtrar los que no tienen ID)
        this.suppliers = proveedores
          .filter(proveedor => proveedor.ID !== undefined) // Filtrar proveedores sin ID
          .map(proveedor => {
            // Construir dirección completa a partir de los campos separados
            const direccionParts = [
              proveedor.calle,
              proveedor.numero_ext,
              proveedor.numero_int ? `Int. ${proveedor.numero_int}` : '',
              proveedor.colonia,
              proveedor.municipio,
              proveedor.estado,
              proveedor.Cpostal
            ].filter(part => part && part.trim() !== '');
            
            const direccionCompleta = direccionParts.length > 0 
              ? direccionParts.join(', ') 
              : undefined;

            return {
              id: proveedor.ID!, // Usar ! porque ya filtramos los undefined
              nombre: proveedor.nombre,
              rfc: proveedor.rfc || undefined,
              direccion: direccionCompleta
            };
          });
        
        this.filteredSuppliers.next(this.suppliers.slice());
        this.loadingSuppliers = false;

        // Si estamos en modo edición, recargar el proveedor seleccionado
        if (this.data?.order?.supplierId) {
          this.selectedSupplier = this.suppliers.find(s => s.id === this.data.order.supplierId) || null;
        }
      },
      error: (error) => {
        console.error('Error al cargar proveedores:', error);
        this.loadingSuppliers = false;
        Swal.fire({
          icon: 'error',
          title: 'Error al cargar proveedores',
          text: error.message || 'No se pudieron cargar los proveedores',
          confirmButtonText: 'Aceptar'
        });
        
        // Inicializar con array vacío para evitar errores
        this.suppliers = [];
        this.filteredSuppliers.next([]);
      }
    });
  }

  loadProducts(): void {
    this.loadingProducts = true;
    
    this.productService.getProducts().subscribe({
      next: (products: Product[]) => {
        console.log('Productos cargados:', products);
        this.products = products;
        
        // Actualizar todos los filtros de productos existentes
        this.filteredProducts.forEach(subject => {
          subject.next(products.slice());
        });
        
        this.loadingProducts = false;
      },
      error: (error) => {
        console.error('Error al cargar productos:', error);
        this.loadingProducts = false;
        Swal.fire({
          icon: 'error',
          title: 'Error al cargar productos',
          text: error.error?.message || 'No se pudieron cargar los productos',
          confirmButtonText: 'Aceptar'
        });
        
        // Inicializar con array vacío para evitar errores
        this.products = [];
        this.filteredProducts.forEach(subject => {
          subject.next([]);
        });
      }
    });
  }

  setupFilters(): void {
    // Filtro de proveedores
    this.supplierFilterCtrl.valueChanges
      .pipe(takeUntil(this._onDestroy))
      .subscribe(() => {
        this.filterSuppliers();
      });

    // Filtro de productos
    this.productFilterCtrl.valueChanges
      .pipe(takeUntil(this._onDestroy))
      .subscribe(() => {
        this.filterProducts();
      });
  }

  filterSuppliers(): void {
    if (!this.suppliers) {
      return;
    }
    let search = this.supplierFilterCtrl.value;
    if (!search) {
      this.filteredSuppliers.next(this.suppliers.slice());
      return;
    } else {
      search = search.toLowerCase();
    }
    this.filteredSuppliers.next(
      this.suppliers.filter(supplier => 
        supplier.nombre.toLowerCase().indexOf(search!) > -1 ||
        (supplier.rfc && supplier.rfc.toLowerCase().indexOf(search!) > -1)
      )
    );
  }

  filterProducts(): void {
    if (!this.products) {
      return;
    }
    let search = this.productFilterCtrl.value;
    if (!search) {
      this.filteredProducts.forEach(subject => {
        subject.next(this.products.slice());
      });
      return;
    } else {
      search = search.toLowerCase();
    }
    const filtered = this.products.filter(product => 
      product.name.toLowerCase().indexOf(search!) > -1 ||
      (product.id && product.id.toString().indexOf(search!) > -1)
    );
    this.filteredProducts.forEach(subject => {
      subject.next(filtered);
    });
  }

  onSupplierSelect(event: any): void {
    const supplierId = event.value;
    this.selectedSupplier = this.suppliers.find(s => s.id === supplierId) || null;
    
    if (this.selectedSupplier) {
      this.orderForm.patchValue({
        supplierName: this.selectedSupplier.nombre
      });
    }
  }

  onProductSelect(event: any, index: number): void {
    const productId = event.value;
    const product = this.products.find(p => p.id === productId);
    
    if (product) {
      const item = this.items.at(index);
      item.patchValue({
        productName: product.name,
        productSku: product.id.toString(), // Usar ID como SKU si no existe campo SKU
        unitCost: product.price
      });
      this.calculateItemTotal(index);
    }
  }

  calculateItemTotal(index: number): void {
    const item = this.items.at(index);
    const quantity = item.get('quantity')?.value || 0;
    const unitCost = item.get('unitCost')?.value || 0;
    const taxRate = item.get('taxRate')?.value || 0;

    const subtotal = quantity * unitCost;
    const taxAmount = (subtotal * taxRate) / 100;
    const total = subtotal + taxAmount;

    item.patchValue({
      subtotal: subtotal,
      taxAmount: taxAmount,
      total: total
    }, { emitEvent: false });

    this.calculateOrderTotals();
  }

  calculateOrderTotals(): void {
    let subtotal = 0;
    let tax = 0;

    this.items.controls.forEach(item => {
      subtotal += item.get('subtotal')?.value || 0;
      tax += item.get('taxAmount')?.value || 0;
    });

    const total = subtotal + tax;

    this.orderForm.patchValue({
      subtotal: subtotal,
      tax: tax,
      total: total
    }, { emitEvent: false });
  }

  onSubmit(): void {
    if (this.orderForm.invalid) {
      Swal.fire('Error', 'Por favor completa todos los campos requeridos', 'error');
      Object.keys(this.orderForm.controls).forEach(key => {
        const control = this.orderForm.get(key);
        if (control && control.invalid) {
          control.markAsTouched();
        }
      });
      return;
    }

    this.loading = true;
    const formData = this.orderForm.value;

    const createDto: CreatePurchaseOrderDto = {
  supplierId: this.orderForm.value.supplierId,
  supplierName: this.getSupplierName(this.orderForm.value.supplierId),
  status: this.orderForm.value.status || 'DRAFT',
  orderDate: this.orderForm.value.orderDate,
  expectedDate: this.orderForm.value.expectedDate,
  currency: this.orderForm.value.currency,
  notes: this.orderForm.value.notes,
  items: this.orderForm.value.items.map((item: any) => ({
    productId: item.productId,
    productName: item.productName,
    description: item.description,
    quantity: item.quantity,
    unitCost: item.unitCost,
    taxRate: item.taxRate || 0,
    notes: item.notes
  }))
};

const operation = this.data.isEditMode && this.data.order?.id
  ? this.purchaseOrderService.update(this.data.order.id, createDto)
  : this.purchaseOrderService.create(createDto);

    operation.subscribe({
      next: (result) => {
        this.loading = false;
        Swal.fire(
          'Éxito',
          `Orden ${this.isEditMode ? 'actualizada' : 'creada'} correctamente`,
          'success'
        );
        this.dialogRef.close(result);
      },
      error: (error) => {
        this.loading = false;
        console.error('Error:', error);
        Swal.fire('Error', error.error?.message || 'No se pudo guardar la orden', 'error');
      }
    });
  }
/**
 * Obtener nombre del proveedor por ID
 */
private getSupplierName(supplierId: number): string {
  const supplier = this.suppliers.find(s => s.id === supplierId);
  return supplier ? supplier.nombre : `Proveedor-${supplierId}`;
}
  onClose(): void {
    this.dialogRef.close();
  }
}