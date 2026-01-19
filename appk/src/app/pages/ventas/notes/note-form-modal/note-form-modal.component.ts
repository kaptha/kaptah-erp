import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, AbstractControl, FormControl, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { SaleNote, SaleNoteItem } from '../../../../models/sale-note.model';
import { NoteService } from '../../../../services/ventas/notes/note.service';
import { ApibizService } from '../../../../services/apibiz.service';
import { ProductService } from '../../../../services/inventory/product.service';
import { ServiceService } from '../../../../services/inventory/service.service';
import { ImpuestosService } from '../../../../services/impuestos.service';
import { SucursalesService } from '../../../../services/sucursales.service';
import { Sweetalert } from '../../../../functions';
import Swal from 'sweetalert2';
import { Observable, of } from 'rxjs';
import { map, startWith, switchMap, take } from 'rxjs/operators';
import { Cliente } from '../../../../models/cliente.model';
import { Product } from '../../../../models/product.model';
import { Service } from '../../../../models/service.model';
import { Sucursal } from '../../../../models/sucursal.model';
import { MatSnackBar } from '@angular/material/snack-bar'; 

// Definir interfaz SaleNoteTax ya que no está correctamente exportada del modelo
interface SaleNoteTax {
  taxId?: number;
  name: string;
  rate: number;
  amount: number;
}

// Interfaz para el modelo de Impuesto del servicio
interface Impuesto {
  id?: number;
  alias: string;
  uso: string;
  tipo_impuesto: string;
  impuesto: string;
  tasa: number;
  valor_cuota: string;  
  userId: number;
}
interface NoteFormModalData {
  mode?: 'create' | 'edit';
  note?: SaleNote;
  fromOrder?: boolean;
  orderData?: any;
}
@Component({
    selector: 'app-note-form-modal',
    templateUrl: './note-form-modal.component.html',
    styleUrls: ['./note-form-modal.component.css'],
    standalone: false
})
export class NoteFormModalComponent implements OnInit {
  noteForm!: FormGroup;
  isFromOrder: boolean = false;
  customerFilterCtrl = new FormControl('');
  itemFilterCtrl = new FormControl('');
  
  filteredCustomers!: Observable<Cliente[]>;
  filteredItems: Observable<Product[] | Service[]>[] = [];
  
  selectedCustomer: Cliente | null = null;
  taxesList: Impuesto[] = [];

  // Propiedades para sucursales
  sucursales: Sucursal[] = [];
  selectedSucursal: Sucursal | null = null;
  loadingSucursales: boolean = false;

  // ✨ NUEVO: Almacenar productos cargados para validación de stock
  productsList: any[] = [];

  loading: boolean = false;
  
  
  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<NoteFormModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: NoteFormModalData,
    private apibizService: ApibizService,
    private productService: ProductService,
    private serviceService: ServiceService,
    private impuestosService: ImpuestosService,
    private sucursalesService: SucursalesService,
    private snackBar: MatSnackBar,
    private noteService: NoteService,
    private router: Router,
  ) {
    this.createForm();
  }

  ngOnInit() {
  console.log('🎬 === INICIO ngOnInit del modal ===');
  console.log('📥 this.data recibido:', this.data);
  console.log('📥 Tipo de this.data:', typeof this.data);
  console.log('📥 ¿Es null?:', this.data === null);
  console.log('📥 ¿Es undefined?:', this.data === undefined);
  
  if (this.data) {
    console.log('✅ this.data existe');
    console.log('📋 Propiedades de this.data:', Object.keys(this.data));
    console.log('🔍 fromOrder:', this.data.fromOrder);
    console.log('🔍 orderData:', this.data.orderData);
    
    if (this.data.orderData) {
      console.log('📦 orderData completo:', this.data.orderData);
      console.log('👤 customerName:', this.data.orderData.customerName);
      console.log('📋 items:', this.data.orderData.items);
    }
  } else {
    console.log('❌ this.data es null o undefined');
  }
  
  this.loadCustomers();
  this.loadTaxes();
  this.loadSucursales();
  this.loadProducts();
  
  // ⏰ TIMEOUT DE 500ms
  setTimeout(() => {
    console.log('⏰ === Ejecutando setTimeout ===');
    console.log('⏰ Evaluando this.data:', this.data);
    
    if (this.data) {
      console.log('✅ this.data existe en setTimeout');
      console.log('🔍 Verificando fromOrder:', this.data.fromOrder);
      console.log('🔍 Tipo de fromOrder:', typeof this.data.fromOrder);
      console.log('🔍 Verificando orderData:', this.data.orderData);
      console.log('🔍 Tipo de orderData:', typeof this.data.orderData);
      
      // ✅ PRIMERA CONDICIÓN: Crear desde orden
      if (this.data.fromOrder === true && this.data.orderData) {
        console.log('🎯 CONDICIÓN CUMPLIDA: fromOrder && orderData');
        console.log('📦 Llamando populateFromOrder...');
        this.populateFromOrder(this.data.orderData);
      } 
      // ✅ SEGUNDA CONDICIÓN: Editar nota con estructura nueva
      else if (this.data.note) {
        console.log('📝 Modo edición con .note');
        this.patchForm(this.data.note);
      }
      // ✅ TERCERA CONDICIÓN: Editar nota formato legacy
      else if ('id' in this.data && 'customerName' in this.data) {
        console.log('📝 Modo edición formato legacy');
        this.patchForm(this.data as any as SaleNote);
      }
      // ❌ NINGUNA CONDICIÓN CUMPLIDA
      else {
        console.log('⚠️ Ninguna condición cumplida');
        console.log('⚠️ this.data:', this.data);
        this.addItem();
      }
    } else {
      console.log('➕ this.data es null - crear nota vacía');
      this.addItem();
    }
  }, 500);
}

  populateFromOrder(orderData: any): void {
  console.log('🎨 === INICIO populateFromOrder ===');
  
  try {
    this.isFromOrder = true;
    
    this.filteredCustomers.pipe(take(1)).subscribe({
      next: (customers: Cliente[]) => {
        const matchingCustomer = customers.find(
          c => c.Rfc === orderData.customerRfc
        );
        
        if (matchingCustomer) {
          this.selectedCustomer = matchingCustomer;
        }
        
        // Convertir valores a números
        const subtotal = parseFloat(orderData.subtotal) || 0;
        const tax = parseFloat(orderData.tax) || 0;
        const total = parseFloat(orderData.total) || 0;
        
        console.log('💰 Totales generales:', { subtotal, tax, total });
        
        this.noteForm.patchValue({
          customerId: matchingCustomer ? matchingCustomer.ID : null,
          customerName: orderData.customerName,
          customerRfc: orderData.customerRfc,
          customerAddress: orderData.customerAddress,
          subtotal: subtotal,
          taxesTotal: tax,      // ✅ Impuestos totales
          total: total,
          sucursalId: orderData.sucursalId,
          paymentMethod: 'CASH',
          saleDate: new Date()
        });
        
        // Sucursal
        if (orderData.sucursalId && this.sucursales.length > 0) {
          this.selectedSucursal = this.sucursales.find(
            s => s.id === orderData.sucursalId
          ) || null;
        }
        
        // ✅ CRÍTICO: Poblar items CON impuestos
        const itemsArray = this.noteForm.get('items') as FormArray;
        while (itemsArray.length) itemsArray.removeAt(0);
        
        this.filteredItems = [];
        
        orderData.items.forEach((item: any, index: number) => {
          console.log(`➕ Item ${index} original:`, item);
          
          // Convertir valores a números
          const quantity = parseFloat(item.quantity) || 1;
          const unitPrice = parseFloat(item.unitPrice) || 0;
          const itemSubtotal = parseFloat(item.subtotal) || 0;
          
          // ✅ CRÍTICO: Obtener impuestos del item
          const itemTax = parseFloat(item.tax || item.taxesTotal) || 0;
          
          // ✅ CRÍTICO: Calcular total con impuestos
          const itemTotal = itemSubtotal + itemTax;
          
          console.log(`💰 Item ${index} calculado:`, {
            subtotal: itemSubtotal,
            tax: itemTax,
            total: itemTotal
          });
          
          // ✅ Crear FormGroup del item
          itemsArray.push(this.fb.group({
            type: ['product'],
            itemId: [item.productId],
            description: [item.description],
            quantity: [quantity],
            unitPrice: [unitPrice],
            subtotal: [itemSubtotal],
            taxesTotal: [itemTax],    // ✅ Impuestos del item
            total: [itemTotal],        // ✅ Total con impuestos
            taxes: this.fb.array([])
          }));
          
          // Buscar producto para el select
          const product = this.productsList.find(p => p.id == item.productId);
          this.filteredItems[index] = product ? of([product]) : of([]);
        });
        
        console.log('✅ Total items agregados:', itemsArray.length);
        
        // ✅ Inicializar impuestos para cada item
        for (let i = 0; i < itemsArray.length; i++) {
          this.initializeTaxesForItem(i);
          
          // ✅ OPCIONAL: Marcar impuestos como aplicados si vienen de la orden
          // Esto es solo visual, no afecta el guardado
          this.markAppliedTaxes(i);
        }
        
        // Deshabilitar campos
        this.noteForm.get('customerName')?.disable();
        this.noteForm.get('customerRfc')?.disable();
        this.noteForm.get('customerAddress')?.disable();
        this.noteForm.get('customerId')?.disable();
        
        // ✅ Verificación final
        const finalData = this.noteForm.getRawValue();
        console.log('🔍 Verificación final:');
        console.log('  Subtotal:', finalData.subtotal);
        console.log('  TaxesTotal:', finalData.taxesTotal);
        console.log('  Total:', finalData.total);
        console.log('  Items:', finalData.items);
        
        console.log('✅ ✅ ✅ populateFromOrder completado');
      }
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}
private markAppliedTaxes(itemIndex: number): void {
  const itemsArray = this.noteForm.get('items') as FormArray;
  const item = itemsArray.at(itemIndex) as FormGroup;
  const taxesArray = item.get('taxes') as FormArray;
  const itemTaxTotal = item.get('taxesTotal')?.value || 0;
  
  // Si el item tiene impuestos aplicados
  if (itemTaxTotal > 0 && this.taxesList && this.taxesList.length > 0) {
    // Buscar el impuesto IVA (16%)
    const ivaIndex = this.taxesList.findIndex(t => 
      t.tasa === 0.16 && t.tipo_impuesto?.toLowerCase().includes('traslado')
    );
    
    if (ivaIndex >= 0 && ivaIndex < taxesArray.length) {
      const taxControl = taxesArray.at(ivaIndex) as FormGroup;
      taxControl.patchValue({
        selected: true,
        amount: itemTaxTotal
      });
      console.log(`✅ IVA marcado como aplicado en item ${itemIndex}`);
    }
  }
}
calculateTotals(): void {
  const itemsArray = this.noteForm.get('items') as FormArray;
  let subtotalGeneral = 0;
  let taxesTotalGeneral = 0;

  itemsArray.controls.forEach((item: any) => {
    const itemValue = item.getRawValue();
    subtotalGeneral += parseFloat(itemValue.subtotal) || 0;
    taxesTotalGeneral += parseFloat(itemValue.taxesTotal) || 0;
  });

  const totalGeneral = subtotalGeneral + taxesTotalGeneral;

  console.log('💰 Totales calculados:', {
    subtotal: subtotalGeneral,
    taxesTotal: taxesTotalGeneral,
    total: totalGeneral
  });

  this.noteForm.patchValue({
    subtotal: subtotalGeneral,
    taxesTotal: taxesTotalGeneral,
    total: totalGeneral
  }, { emitEvent: false });
}
/**
 * Inicializa el array de impuestos para un item específico
 */
private initializeTaxesForItem(itemIndex: number): void {
  try {
    const itemsArray = this.noteForm.get('items') as FormArray;
    const item = itemsArray.at(itemIndex) as FormGroup;
    const taxesArray = item.get('taxes') as FormArray;
    
    if (!taxesArray) {
      console.warn(`⚠️ taxes no existe para item ${itemIndex}`);
      return;
    }
    
    // Limpiar impuestos existentes
    while (taxesArray.length) {
      taxesArray.removeAt(0);
    }
    
    // Agregar cada impuesto como no seleccionado
    if (this.taxesList && this.taxesList.length > 0) {
      this.taxesList.forEach(() => {
        taxesArray.push(this.fb.group({
          selected: [false],
          amount: [0]
        }));
      });
      console.log(`✅ ${this.taxesList.length} impuestos inicializados para item ${itemIndex}`);
    }
    
  } catch (error) {
    console.error(`❌ Error inicializando impuestos para item ${itemIndex}:`, error);
  }
}


  createForm() {
    this.noteForm = this.fb.group({
      customerId: ['', Validators.required],
      customerName: [''],
      customerRfc: [''],
      customerAddress: [''],
      sucursalId: [null],
      saleDate: [new Date(), Validators.required],
      paymentMethod: ['CASH', Validators.required],
      items: this.fb.array([], [Validators.required, Validators.minLength(1)]),
      status: ['COMPLETED'], // ✨ CAMBIADO: De PENDING a COMPLETED
      subtotal: [0],
      taxesTotal: [0],
      total: [0]
    });
  }

  loadCustomers() {
    this.apibizService.getClients().subscribe(
      clients => {
        this.filteredCustomers = this.customerFilterCtrl.valueChanges.pipe(
          startWith(''),
          map(value => this._filterCustomers(clients, value))
        );
      },
      error => console.error('Error loading customers:', error)
    );
  }

  loadTaxes() {
    this.impuestosService.getImpuestos().subscribe(
      taxes => {
        this.taxesList = taxes;
        
        // Si ya hay ítems, inicializar sus impuestos
        if (this.items.length > 0) {
          for (let i = 0; i < this.items.length; i++) {
            this.initItemTaxes(i);
          }
        }
      },
      error => console.error('Error loading taxes:', error)
    );
  }

  // Cargar todas las sucursales disponibles
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

  // ✨ NUEVO: Cargar productos para validación de stock
  loadProducts(): void {
    this.productService.getProducts().subscribe({
      next: (products) => {
        this.productsList = products;
        console.log('📦 Productos cargados:', products.length);
      },
      error: (error) => {
        console.error('❌ Error al cargar productos:', error);
      }
    });
  }

  // ✨ NUEVO: Obtener stock disponible de un producto
  getAvailableStock(productId: number): number {
    const product = this.productsList.find(p => p.id === productId);
    if (!product) {
      console.log('⚠️ Producto no encontrado:', productId);
      return 0;
    }
    
    // ✅ El campo es currentStock (camelCase), no current_stock
    const stock = product.currentStock ?? product.stock ?? 0;
    console.log(`📊 Stock para producto ${productId}:`, stock, 'de', product);
    return stock;
  }

  // ✨ NUEVO: Validar si hay suficiente stock
  hasEnoughStock(productId: number, requestedQuantity: number): boolean {
    const availableStock = this.getAvailableStock(productId);
    return availableStock >= requestedQuantity;
  }

  // ✨ NUEVO: Mostrar mensaje de stock
  showStockWarning(productId: number, itemIndex: number): void {
    const product = this.productsList.find(p => p.id === productId);
    
    if (product) {
      // ✅ El campo es currentStock (camelCase)
      const stock = product.currentStock ?? product.stock ?? 0;
      const itemForm = this.items.at(itemIndex);
      const quantity = itemForm.get('quantity')?.value || 0;
      
      if (stock === 0) {
        this.snackBar.open(
          `⚠️ ${product.name}: Sin stock disponible`,
          'Cerrar',
          { duration: 5000, panelClass: ['error-snackbar'] }
        );
      } else if (quantity > stock) {
        this.snackBar.open(
          `⚠️ ${product.name}: Stock insuficiente. Disponible: ${stock}, Solicitado: ${quantity}`,
          'Cerrar',
          { duration: 5000, panelClass: ['warning-snackbar'] }
        );
      } else {
        this.snackBar.open(
          `✅ ${product.name}: Stock disponible: ${stock}`,
          'Cerrar',
          { duration: 3000, panelClass: ['success-snackbar'] }
        );
      }
    }
  }

  // Este método se llama cuando se cambia la selección de un impuesto
  onTaxSelectionChange(itemIndex: number) {
    console.log('Tax selection changed for item:', itemIndex);
    
    // Recalcular impuestos para el ítem específico
    this.calculateItemTaxes(itemIndex);
    
    // Recalcular el total general
    this.calculateTotal();
    
    // Pequeño retraso para permitir que la clase 'selected' se aplique correctamente
    setTimeout(() => {
      const taxesArray = this.items.at(itemIndex).get('taxes') as FormArray;
      
      for (let i = 0; i < taxesArray.length; i++) {
        const isSelected = taxesArray.at(i).get('selected')?.value;
        console.log(`Tax ${i} selected:`, isSelected);
      }
    }, 100);
  }

  private _filterCustomers(clients: Cliente[], value: string | null): Cliente[] {
    const filterValue = (value || '').toLowerCase();
    return clients.filter(customer => 
      customer.nombre.toLowerCase().includes(filterValue) ||
      customer.Rfc.toLowerCase().includes(filterValue)
    );
  }

  onCustomerSelect(event: any) {
    const selectedClientId = event.value;
    if (this.filteredCustomers) {
      this.filteredCustomers.subscribe(clients => {
        const selectedClient = clients.find(
          client => client.ID === selectedClientId
        );
        if (selectedClient) {
          this.selectedCustomer = selectedClient;
          
          // Construir dirección completa
          const customerAddress = `${selectedClient.Colonia || ''} CP: ${selectedClient.Cpostal || ''}`.trim();
          
          this.noteForm.patchValue({
            customerName: selectedClient.nombre,
            customerRfc: selectedClient.Rfc,
            customerAddress: customerAddress,
            sucursalId: null // Resetear sucursal al cambiar cliente
          });
        }
      });
    }
  }

  // Método para manejar selección de sucursal
  onSucursalSelect(event: any) {
    const selectedSucursalId = event.value;
    
    if (selectedSucursalId === null) {
      this.selectedSucursal = null;
      // Restaurar dirección del cliente principal
      if (this.selectedCustomer) {
        const customerAddress = `${this.selectedCustomer.Colonia || ''} CP: ${this.selectedCustomer.Cpostal || ''}`.trim();
        this.noteForm.patchValue({
          customerAddress: customerAddress
        });
      }
    } else {
      const sucursal = this.sucursales.find(s => s.id === selectedSucursalId);
      if (sucursal) {
        this.selectedSucursal = sucursal;
        // Usar dirección de la sucursal
        const sucursalAddress = `${sucursal.direccion}, ${sucursal.colonia} CP: ${sucursal.codigoPostal}`.trim();
        this.noteForm.patchValue({
          customerAddress: sucursalAddress
        });
      }
    }
  }

  get items(): FormArray {
    return this.noteForm.get('items') as FormArray;
  }

  get taxes(): FormArray[] {
    const result: FormArray[] = [];
    for (let i = 0; i < this.items.length; i++) {
      result.push(this.items.at(i).get('taxes') as FormArray);
    }
    return result;
  }
  
  getSelectedTaxesForItem(itemIndex: number): any[] {
    const selectedTaxes: any[] = [];
    const taxesArray = this.items.at(itemIndex).get('taxes') as FormArray;
    
    taxesArray.controls.forEach((control, index) => {
      if (control.get('selected')?.value) {
        selectedTaxes.push({
          ...this.taxesList[index],
          amount: this.calculateSingleTaxAmount(itemIndex, index)
        });
      }
    });
    
    return selectedTaxes;
  }
  
  calculateSingleTaxAmount(itemIndex: number, taxIndex: number): number {
    const itemForm = this.items.at(itemIndex);
    const subtotal = itemForm.get('subtotal')?.value || 0;
    const taxForm = this.items.at(itemIndex).get('taxes') as FormArray;
    const taxRate = taxForm.at(taxIndex).get('tasa')?.value || 0;
    
    return subtotal * taxRate;
  }

  addItem(item?: any) {
    const itemForm = this.fb.group({
      type: [item?.type || 'product'],
      itemId: [item?.productId || null],
      description: [item?.description || ''],
      quantity: [item?.quantity || 1, [Validators.required, Validators.min(1)]], // ✨ NUEVO: Validación mínima
      unitPrice: [item?.unitPrice || 0, [Validators.required, Validators.min(0)]],
      subtotal: [item?.subtotal || 0],
      taxesTotal: [item?.taxesTotal || 0],
      taxes: this.fb.array([]),
      total: [item?.total || 0]
    });

    this.items.push(itemForm);
    this.initItemTaxes(this.items.length - 1);
    this.setupItemFilters(this.items.length - 1);
    
    if (item) {
      this.calculateItemTotal(this.items.length - 1);
    }
  }

  private initItemTaxes(itemIndex: number) {
    const itemForm = this.items.at(itemIndex);
    const taxesArray = itemForm.get('taxes') as FormArray;
    
    // Limpiar impuestos existentes
    while (taxesArray.length > 0) {
      taxesArray.removeAt(0);
    }
    
    // Agregar todos los impuestos disponibles como opciones
    this.taxesList.forEach(tax => {
      taxesArray.push(this.fb.group({
        selected: [false],
        id: [tax.id],
        alias: [tax.alias],
        tasa: [tax.tasa]
      }));
    });
  }

  private setupItemFilters(index: number) {
    const itemForm = this.items.at(index);
    const type = itemForm.get('type')?.value;
    
    this.filteredItems[index] = itemForm.get('description')!.valueChanges.pipe(
      startWith(''),
      switchMap((filterValue: string | null) => {
        if (type === 'product') {
          return this.productService.getProducts().pipe(
            map(products => this._filterProducts(products, filterValue))
          );
        } else {
          return this.serviceService.getServices().pipe(
            map(services => this._filterServices(services, filterValue))
          );
        }
      })
    );
  }

  private _filterProducts(products: Product[], filterValue: string | null): Product[] {
    const filter = (filterValue || '').toLowerCase();
    return products.filter(product => 
      product.name.toLowerCase().includes(filter)
    );
  }

  private _filterServices(services: Service[], filterValue: string | null): Service[] {
    const filter = (filterValue || '').toLowerCase();
    return services.filter(service => 
      service.name.toLowerCase().includes(filter)
    );
  }

  onTypeChange(index: number) {
    const itemForm = this.items.at(index);
    const type = itemForm.get('type')?.value;
    
    if (type === 'product') {
      this.productService.getProducts().subscribe(products => {
        this.filteredItems[index] = of(products);
      });
    } else {
      this.serviceService.getServices().subscribe(services => {
        this.filteredItems[index] = of(services);
      });
    }
  }

  onItemSelect(event: any, index: number) {
    const itemForm = this.items.at(index);
    const type = itemForm.get('type')?.value;
    const selectedId = event.value;

    if (type === 'product') {
      this.productService.getProducts().subscribe((products: Product[]) => {
        const selectedProduct = products.find(p => p.id === selectedId);
        if (selectedProduct) {
          itemForm.patchValue({
            description: selectedProduct.name,
            unitPrice: selectedProduct.price,
          });
          this.calculateItemTotal(index);
          
          // ✨ NUEVO: Mostrar stock disponible
          this.showStockWarning(selectedId, index);
        }
      });
    } else {
      this.serviceService.getServices().subscribe((services: Service[]) => {
        const selectedService = services.find(s => s.id === selectedId);
        if (selectedService) {
          itemForm.patchValue({
            description: selectedService.name,
            unitPrice: selectedService.price,
          });
          this.calculateItemTotal(index);
        }
      });
    }
  }

  removeItem(index: number) {
    this.items.removeAt(index);
    this.calculateTotal();
  }

  // ✨ MODIFICADO: Validar stock al cambiar cantidad
  calculateItemTotal(index: number) {
    const itemForm = this.items.at(index);
    const quantity = itemForm.get('quantity')?.value || 0;
    const unitPrice = itemForm.get('unitPrice')?.value || 0;
    const subtotal = quantity * unitPrice;
    const type = itemForm.get('type')?.value;
    const itemId = itemForm.get('itemId')?.value;
    
    // ✨ NUEVO: Validar stock si es un producto
    if (type === 'product' && itemId) {
      const availableStock = this.getAvailableStock(itemId);
      
      if (quantity > availableStock) {
        // Marcar el control de cantidad como inválido
        itemForm.get('quantity')?.setErrors({ insufficientStock: true });
        
        this.snackBar.open(
          `⚠️ Stock insuficiente. Disponible: ${availableStock}`,
          'Cerrar',
          { duration: 4000, panelClass: ['warning-snackbar'] }
        );
      } else {
        // Limpiar error si la cantidad es válida
        const quantityControl = itemForm.get('quantity');
        if (quantityControl?.hasError('insufficientStock')) {
          quantityControl.setErrors(null);
        }
      }
    }
    
    // Calcular el subtotal del ítem
    itemForm.patchValue({
      subtotal: subtotal
    });
    
    // Calcular los impuestos para este ítem
    this.calculateItemTaxes(index);
    
    // Recalcular el total general
    this.calculateTotal();
  }
  
  calculateItemTaxes(index: number) {
    const itemForm = this.items.at(index);
    const subtotal = itemForm.get('subtotal')?.value || 0;
    const taxesArray = itemForm.get('taxes') as FormArray;
    
    let taxesTotal = 0;
    
    // Calcular cada impuesto seleccionado para este ítem
    for (let i = 0; i < taxesArray.length; i++) {
      const taxControl = taxesArray.at(i);
      if (taxControl.get('selected')?.value) {
        const taxRate = taxControl.get('tasa')?.value || 0;
        const taxAmount = subtotal * taxRate;
        taxesTotal += taxAmount;
      }
    }
    
    // Actualizar el total de impuestos y el total del ítem
    itemForm.patchValue({
      taxesTotal: taxesTotal,
      total: subtotal + taxesTotal
    });
    
    return taxesTotal;
  }

  calculateTotal() {
    // Calcular subtotal y total de la nota sumando todos los ítems
    let subtotal = 0;
    let taxesTotal = 0;
    let total = 0;
    
    this.items.controls.forEach((itemControl: AbstractControl) => {
      subtotal += itemControl.get('subtotal')?.value || 0;
      taxesTotal += itemControl.get('taxesTotal')?.value || 0;
      total += itemControl.get('total')?.value || 0;
    });
    
    // Actualizar el formulario con los totales
    this.noteForm.patchValue({
      subtotal: subtotal,
      taxesTotal: taxesTotal,
      total: total
    });
    
    return total;
  }

  private patchForm(data: SaleNote) {
    // Buscar el cliente para establecer el ID
    this.apibizService.getClients().subscribe(clients => {
      const client = clients.find(c => c.Rfc === data.customerRfc);
      if (client) {
        this.selectedCustomer = client;
        this.noteForm.patchValue({
          customerId: client.ID
        });
      }
    });
    
    // ✨ Validar que el status sea válido (COMPLETED o CANCELLED)
    const validStatus = ['COMPLETED', 'CANCELLED'].includes(data.status) 
      ? data.status 
      : 'COMPLETED';
    
    this.noteForm.patchValue({
      customerName: data.customerName,
      customerRfc: data.customerRfc,
      saleDate: new Date(data.saleDate),
      paymentMethod: data.paymentMethod,
      status: validStatus
    });

    // Limpiar los ítems existentes
    while (this.items.length > 0) {
      this.items.removeAt(0);
    }

    if (data.items?.length) {
      data.items.forEach((item: any) => this.addItem(item));
      
      // Para cada ítem, intentamos aplicar los impuestos si existen
      data.items.forEach((item: any, index: number) => {
        // Verificar si el ítem tiene la propiedad 'taxes' y es un array
        if (item.taxes && Array.isArray(item.taxes) && this.taxesList.length > 0) {
          const taxesArray = this.items.at(index).get('taxes') as FormArray;
          
          // Para cada impuesto en el ítem, marcarlo como seleccionado
          item.taxes.forEach((itemTax: any) => {
            const taxIndex = this.taxesList.findIndex(tax => tax.id === itemTax.taxId);
            if (taxIndex >= 0 && taxesArray.length > taxIndex) {
              const taxForm = taxesArray.at(taxIndex);
              taxForm.patchValue({
                selected: true
              });
            }
          });
          
          // Recalcular impuestos para este ítem
          this.calculateItemTaxes(index);
        }
      });
    } else {
      this.addItem();
    }
    
    this.calculateTotal();
  }

  // ✨ MODIFICADO: Validar stock antes de enviar
  onSubmit(): void {
  console.log('📤 === INICIO onSubmit ===');
  
  if (this.noteForm.invalid) {
    Sweetalert.fnc('error', 'Complete todos los campos requeridos', null);
    return;
  }

  const formData = this.noteForm.getRawValue();
  
  console.log('📋 Form data RAW:', formData);

  // ✅ Validar que los items tengan impuestos
  formData.items.forEach((item: any, i: number) => {
    console.log(`Item ${i}:`, {
      subtotal: item.subtotal,
      taxesTotal: item.taxesTotal,
      total: item.total
    });
  });

  const noteDto = {
    customerId: formData.customerId,
    customerName: formData.customerName,
    customerRfc: formData.customerRfc,
    customerAddress: formData.customerAddress,
    sucursalId: formData.sucursalId,
    paymentMethod: formData.paymentMethod || 'CASH',
    saleDate: formData.saleDate || new Date(),
    requiresCFDI: formData.requiresCFDI || false,
    
    items: formData.items.map((item: any) => {
      const itemSubtotal = Number(item.subtotal) || 0;
      const itemTaxesTotal = Number(item.taxesTotal) || 0;
      const itemTotal = Number(item.total) || (itemSubtotal + itemTaxesTotal);
      
      return {
        type: item.type || 'product',
        itemId: item.itemId,
        description: item.description,
        quantity: Number(item.quantity) || 1,
        unitPrice: Number(item.unitPrice) || 0,
        subtotal: itemSubtotal,
        taxesTotal: itemTaxesTotal,  // ✅ Debe tener valor
        total: itemTotal,             // ✅ Debe incluir impuestos
        taxes: item.taxes || []
      };
    }),
    
    subtotal: Number(formData.subtotal) || 0,
    taxesTotal: Number(formData.taxesTotal) || 0,  // ✅ Total de impuestos
    total: Number(formData.total) || 0,
    notes: formData.notes || ''
  };

  console.log('📤 DTO FINAL:', noteDto);
  console.log('💰 Total general:', noteDto.total);
  console.log('💰 Impuestos totales:', noteDto.taxesTotal);

  // Validación
  if (!noteDto.total || isNaN(noteDto.total)) {
    Sweetalert.fnc('error', 'El total es inválido', null);
    return;
  }

  Sweetalert.fnc('loading', 'Guardando...', null);
  this.loading = true;

  this.noteService.create(noteDto).subscribe({
    next: (response) => {
      console.log('✅ Nota guardada:', response);
      Sweetalert.fnc('close', '', null);
      Sweetalert.fnc('success', 'Nota creada correctamente', null);
      
      setTimeout(() => {
        this.dialogRef.close({ saved: true, note: response });
      }, 1500);
    },
    error: (error) => {
      console.error('❌ Error:', error);
      Sweetalert.fnc('close', '', null);
      Sweetalert.fnc('error', error.error?.message || 'Error', null);
      this.loading = false;
    }
  });
}

  onClose() {
    this.dialogRef.close();
  }
}