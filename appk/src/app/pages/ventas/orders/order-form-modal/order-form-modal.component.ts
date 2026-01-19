import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, FormControl, Validators, AbstractControl } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Observable, of } from 'rxjs';
import { map, startWith, switchMap } from 'rxjs/operators';
import { ApibizService } from '../../../../services/apibiz.service';
import { ProductService } from '../../../../services/inventory/product.service';
import { ServiceService } from '../../../../services/inventory/service.service';
import { ImpuestosService } from '../../../../services/impuestos.service';
import { SucursalesService } from '../../../../services/sucursales.service';

import { Sucursal } from '../../../../models/sucursal.model';
import { Cliente } from '../../../../models/cliente.model';
import { Product } from '../../../../models/product.model';
import { Service } from '../../../../models/service.model';

// Definir interfaz para los impuestos
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

@Component({
    selector: 'app-order-form-modal',
    templateUrl: './order-form-modal.component.html',
    styleUrls: ['./order-form-modal.component.css'],
    standalone: false
})
export class OrderFormModalComponent implements OnInit {
  orderForm!: FormGroup;
  customerFilterCtrl = new FormControl('');
  itemFilterCtrl = new FormControl('');
  sucursales: Sucursal[] = []; 
  loadingSucursales: boolean = false;
  selectedSucursal: Sucursal | null = null;
  
  filteredCustomers!: Observable<Cliente[]>;
  filteredItems: Observable<Product[] | Service[]>[] = [];
  
  selectedCustomer: Cliente | null = null;
  taxesList: Impuesto[] = [];
  
  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<OrderFormModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private apibizService: ApibizService,
    private productService: ProductService,
    private serviceService: ServiceService,
    private impuestosService: ImpuestosService,
    private sucursalesService: SucursalesService
  ) {
    this.createForm();
  }

  ngOnInit() {
    this.loadCustomers();
    this.loadTaxes();
    this.loadSucursales();
    
    if (this.data) {
      this.patchForm(this.data);
    } else {
      this.addItem();
    }
  }

  createForm() {
    this.orderForm = this.fb.group({
      customerId: ['', Validators.required],
      sucursalId: [''], // ✨ NUEVO: Campo de sucursal
      items: this.fb.array([], [Validators.required, Validators.minLength(1)]),
      subtotal: [0],
      taxesTotal: [0],
      total: [0]
    });
  }

  get items(): FormArray {
    return this.orderForm.get('items') as FormArray;
  }

  get taxes(): FormArray[] {
    const result: FormArray[] = [];
    for (let i = 0; i < this.items.length; i++) {
      result.push(this.items.at(i).get('taxes') as FormArray);
    }
    return result;
  }

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

  onSucursalSelect(event: any): void {
    const sucursalId = event.value;
    
    if (sucursalId) {
      const sucursal = this.sucursales.find(s => s.id === sucursalId);
      this.selectedSucursal = sucursal || null;
      
      // ✨ NUEVO: Guardar en el formulario
      this.orderForm.patchValue({
        sucursalId: sucursalId
      });
      
      console.log('Sucursal seleccionada:', this.selectedSucursal);
    } else {
      this.selectedSucursal = null;
      this.orderForm.patchValue({
        sucursalId: null
      });
    }
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

  private _filterCustomers(clients: Cliente[], value: string | null): Cliente[] {
    const filterValue = (value || '').toLowerCase();
    return clients.filter(customer => 
      customer.nombre.toLowerCase().includes(filterValue) ||
      customer.Rfc.toLowerCase().includes(filterValue)
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

  addItem(item?: any) {
    const itemForm = this.fb.group({
      type: ['product', Validators.required],
      itemId: ['', Validators.required],
      quantity: [item?.quantity || 1, [Validators.required, Validators.min(1)]],
      unitPrice: [item?.unitPrice || 0],
      subtotal: [0],
      taxes: this.fb.array([]),
      taxesTotal: [0],
      total: [0]
    });

    this.items.push(itemForm);
    this.setupItemFilters(this.items.length - 1);
    
    // Inicializar los impuestos para este ítem
    this.initItemTaxes(this.items.length - 1);
    
    this.calculateItemTotal(this.items.length - 1);
  }
  
  initItemTaxes(itemIndex: number) {
    const itemForm = this.items.at(itemIndex);
    const taxesArray = itemForm.get('taxes') as FormArray;
    
    // Limpiar el array de impuestos
    while (taxesArray.length > 0) {
      taxesArray.removeAt(0);
    }
    
    // Inicializar con todos los impuestos disponibles
    this.taxesList.forEach(tax => {
      taxesArray.push(
        this.fb.group({
          id: [tax.id],
          selected: [false],
          alias: [tax.alias],
          tipo_impuesto: [tax.tipo_impuesto],
          impuesto: [tax.impuesto],
          tasa: [tax.tasa]
        })
      );
    });
  }

  setupItemFilters(index: number) {
    this.filteredItems[index] = this.itemFilterCtrl.valueChanges.pipe(
      startWith(null),
      switchMap((filterValue: string | null) => {
        const type = this.items.at(index).get('type')?.value;
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

  removeItem(index: number) {
    this.items.removeAt(index);
    this.calculateTotal();
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
        }
      });
    }
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
            unitPrice: selectedProduct.price,
          });
          this.calculateItemTotal(index);
        }
      });
    } else {
      this.serviceService.getServices().subscribe((services: Service[]) => {
        const selectedService = services.find(s => s.id === selectedId);
        if (selectedService) {
          itemForm.patchValue({
            unitPrice: selectedService.price,
          });
          this.calculateItemTotal(index);
        }
      });
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

  calculateItemTotal(index: number) {
    const itemForm = this.items.at(index);
    const quantity = itemForm.get('quantity')?.value || 0;
    const unitPrice = itemForm.get('unitPrice')?.value || 0;
    const subtotal = quantity * unitPrice;
    
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
    this.orderForm.patchValue({
      subtotal: subtotal,
      taxesTotal: taxesTotal,
      total: total
    });
    
    return total;
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
    const taxForm = (itemForm.get('taxes') as FormArray).at(taxIndex);
    const subtotal = itemForm.get('subtotal')?.value || 0;
    const taxRate = taxForm.get('tasa')?.value || 0;
    
    return subtotal * taxRate;
  }

  patchForm(data: any) {
    // Buscar el cliente para establecer el ID si existe
    if (data.customerRfc) {
      this.apibizService.getClients().subscribe(clients => {
        const client = clients.find(c => c.Rfc === data.customerRfc);
        if (client) {
          this.selectedCustomer = client;
          this.orderForm.patchValue({
            customerId: client.ID
          });
        }
      });
    }
    
    // Vaciar el array de ítems actual
    while (this.items.length > 0) {
      this.items.removeAt(0);
    }

    // Agregar los ítems de la orden existente
    if (data.items && data.items.length > 0) {
      data.items.forEach((item: any) => {
        this.addItem(item);
      });
      
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
      // Si no hay ítems, añadir uno vacío
      this.addItem();
    }
    
    // Recalcular totales
    this.calculateTotal();
  }

  onSubmit(): void {
    if (this.orderForm.valid && this.selectedCustomer) {
      // Extraer los items con el formato correcto, incluyendo impuestos
      const items = this.items.controls.map((itemControl, index) => {
        const type = itemControl.get('type')?.value;
        const quantity = itemControl.get('quantity')?.value || 0;
        const unitPrice = itemControl.get('unitPrice')?.value || 0;
        
        // Obtener los impuestos seleccionados para este ítem
        const selectedTaxes = this.getSelectedTaxesForItem(index);
        
        // Convertir al formato esperado por el backend
        const formattedTaxes = selectedTaxes.map(tax => ({
          taxId: tax.id,
          name: tax.alias,
          rate: tax.tasa,
          amount: tax.amount
        }));

        return {
          productId: itemControl.get('itemId')?.value,
          description: type === 'product' ? 'Producto' : 'Servicio', // Mejorar con nombre real
          quantity: quantity,
          unitPrice: unitPrice,
          subtotal: itemControl.get('subtotal')?.value,
          taxesTotal: itemControl.get('taxesTotal')?.value,
          taxes: formattedTaxes,
          total: itemControl.get('total')?.value
        };
      });

      const orderData = {
        customerName: this.selectedCustomer.nombre,
        customerAddress: `${this.selectedCustomer.Colonia} CP: ${this.selectedCustomer.Cpostal}`,
        customerRfc: this.selectedCustomer.Rfc,
        sucursalId: this.orderForm.get('sucursalId')?.value || null, // ✨ NUEVO
        items: items,
        subtotal: this.orderForm.get('subtotal')?.value || 0,
        taxesTotal: this.orderForm.get('taxesTotal')?.value || 0,
        total: this.orderForm.get('total')?.value || 0
      };

      this.dialogRef.close(orderData);
    }
  }

  onClose(): void {
    this.dialogRef.close();
  }
}