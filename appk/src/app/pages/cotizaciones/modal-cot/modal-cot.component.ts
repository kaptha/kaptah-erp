import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, FormControl, Validators, AbstractControl } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Observable } from 'rxjs';
import { map, startWith, switchMap } from 'rxjs/operators';

import { ApibizService } from '../../../services/apibiz.service';
import { ProductService } from '../../../services/inventory/product.service';
import { ServiceService } from '../../../services/inventory/service.service';
import { ImpuestosService } from '../../../services/impuestos.service';
import { CotizacionesService } from '../../../services/cotizaciones.service';
import { SucursalesService } from '../../../services/sucursales.service';
import { Sucursal } from '../../../models/sucursal.model'; // ✨ Usar modelo existente

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

// Interfaces para productos y servicios
interface Product {
  id: number;
  name: string;
  description?: string;
  price: number;
}

interface Service {
  id: number;
  name: string;
  description?: string;
  price: number;
}

interface Cliente {
  ID: number;
  nombre: string;
  Rfc: string;
  Colonia?: string;
  Cpostal?: string;
  direccion?: string;
  ciudad?: string;
  Telefono?: string; 
  email?: string;
}

@Component({
    selector: 'app-modal-cot',
    templateUrl: './modal-cot.component.html',
    styleUrls: ['./modal-cot.component.css'],
    standalone: false
})
export class ModalCotComponent implements OnInit {
  cotizacionForm!: FormGroup;
  clienteFilterCtrl = new FormControl('');
  itemFilterCtrl = new FormControl('');
  
  filteredClientes!: Observable<Cliente[]>;
  filteredItems: Observable<Product[] | Service[]>[] = [];
  
  clienteSeleccionado: Cliente | null = null;
  impuestosList: Impuesto[] = [];

  // Propiedades para sucursales
  sucursales: Sucursal[] = [];
  loadingSucursales: boolean = false;
  selectedSucursal: Sucursal | null = null;

  isEdit: boolean;
  viewOnly: boolean = false;
  title: string;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<ModalCotComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private apibizService: ApibizService,
    private productService: ProductService,
    private serviceService: ServiceService,
    private impuestosService: ImpuestosService,
    private cotizacionesService: CotizacionesService,
    private sucursalesService: SucursalesService
  ) {
    this.isEdit = data.isEdit || false;
    this.viewOnly = data.viewOnly || false;
    this.title = this.isEdit ? 'Editar Cotización' : this.viewOnly ? 'Ver Cotización' : 'Nueva Cotización';
    
    this.createForm();
  }

  ngOnInit() {
    this.loadClientes();
    this.loadImpuestos();
    this.loadSucursales();
    
    if (this.data && this.data.cotizacion) {
      this.patchForm(this.data.cotizacion);
    } else {
      this.addItem();
    }
    
    if (this.viewOnly) {
      this.cotizacionForm.disable();
    }
  }

  createForm() {
  this.cotizacionForm = this.fb.group({
    usuarioId: [this.getUserId()],
    clienteId: ['', Validators.required],
    clienteNombre: [''],
    clienteRfc: [''],
    clienteDireccion: [''],
    clienteCiudad: [''],
    clienteTelefono: [''],
    sucursalId: [''],
    fechaValidez: [new Date(), Validators.required],
    estado: ['pendiente', Validators.required],
    moneda: ['MXN', Validators.required],
    items: this.fb.array([], [Validators.required, Validators.minLength(1)]),
    observaciones: [''],
    subtotal: [0],
    impuestos: [0],
    total: [0]
  });
}
  
  private getUserId(): number {
    const userId = localStorage.getItem('userId');
    return userId ? parseInt(userId, 10) : 1;
  }

  loadSucursales(): void {
    this.loadingSucursales = true;
    this.sucursalesService.getSucursales().subscribe({
      next: (sucursales) => {
        this.sucursales = sucursales;
        this.loadingSucursales = false;
        console.log('✅ Sucursales cargadas:', sucursales.length);
      },
      error: (error) => {
        console.error('❌ Error al cargar sucursales:', error);
        this.loadingSucursales = false;
      }
    });
  }

  onSucursalSelect(event: any): void {
    const sucursalId = event.value;
    
    if (sucursalId) {
      const sucursal = this.sucursales.find(s => s.id === sucursalId);
      this.selectedSucursal = sucursal || null;
      
      this.cotizacionForm.patchValue({
        sucursalId: sucursalId
      });
      
      console.log('🏢 Sucursal seleccionada:', this.selectedSucursal);
    } else {
      this.selectedSucursal = null;
      this.cotizacionForm.patchValue({
        sucursalId: null
      });
    }
  }

  loadClientes() {
    this.apibizService.getClients().subscribe(
      clients => {
        this.filteredClientes = this.clienteFilterCtrl.valueChanges.pipe(
          startWith(''),
          map(value => this._filterClientes(clients, value))
        );
      },
      error => console.error('Error al cargar clientes:', error)
    );
  }

  loadImpuestos() {
    this.impuestosService.getImpuestos().subscribe(
      impuestos => {
        this.impuestosList = impuestos;
        
        if (this.items.length > 0) {
          for (let i = 0; i < this.items.length; i++) {
            this.initItemImpuestos(i);
          }
        }
      },
      error => console.error('Error al cargar impuestos:', error)
    );
  }

  onImpuestoSelectionChange(itemIndex: number) {
    console.log('Selección de impuesto cambiada para ítem:', itemIndex);
    
    this.calcularItemImpuestos(itemIndex);
    this.calcularTotales();
    
    setTimeout(() => {
      const impuestosArray = this.items.at(itemIndex).get('impuestos') as FormArray;
      
      for (let i = 0; i < impuestosArray.length; i++) {
        const isSelected = impuestosArray.at(i).get('selected')?.value;
        console.log(`Impuesto ${i} seleccionado:`, isSelected);
      }
    }, 100);
  }

  private _filterClientes(clients: Cliente[], value: string | null): Cliente[] {
    const filterValue = (value || '').toLowerCase();
    return clients.filter(cliente => 
      cliente.nombre.toLowerCase().includes(filterValue) ||
      (cliente.Rfc && cliente.Rfc.toLowerCase().includes(filterValue))
    );
  }

  onClienteSelect(event: any) {
  const selectedClienteId = event.value;
  if (this.filteredClientes) {
    this.filteredClientes.subscribe(clientes => {
      const selectedCliente = clientes.find(
        cliente => cliente.ID === selectedClienteId
      );
      if (selectedCliente) {
        
        this.clienteSeleccionado = selectedCliente;
        this.cotizacionForm.patchValue({
          clienteNombre: selectedCliente.nombre,
          clienteRfc: selectedCliente.Rfc,
          // ✨ AGREGAR ESTOS CAMPOS
          clienteDireccion: selectedCliente.direccion || selectedCliente.Colonia || '',
          clienteCiudad: selectedCliente.ciudad || selectedCliente.Colonia || '',
          clienteTelefono: selectedCliente.Telefono || ''
        });
      }
    });
  }
}

  get items(): FormArray {
    return this.cotizacionForm.get('items') as FormArray;
  }

  get impuestos(): FormArray[] {
    const result: FormArray[] = [];
    for (let i = 0; i < this.items.length; i++) {
      result.push(this.items.at(i).get('impuestos') as FormArray);
    }
    return result;
  }
  
  getImpuestosSeleccionados(itemIndex: number): any[] {
    const selectedImpuestos: any[] = [];
    const impuestosArray = this.items.at(itemIndex).get('impuestos') as FormArray;
    
    impuestosArray.controls.forEach((control, index) => {
      if (control.get('selected')?.value) {
        selectedImpuestos.push({
          ...this.impuestosList[index],
          monto: this.calcularMontoImpuestoIndividual(itemIndex, index)
        });
      }
    });
    
    return selectedImpuestos;
  }
  
  calcularMontoImpuestoIndividual(itemIndex: number, impuestoIndex: number): number {
    const itemForm = this.items.at(itemIndex);
    const impuestoForm = (itemForm.get('impuestos') as FormArray).at(impuestoIndex);
    const subtotal = itemForm.get('subtotal')?.value || 0;
    const tasaImpuesto = impuestoForm.get('tasa')?.value || 0;
    
    return subtotal * tasaImpuesto;
  }

  addItem() {
    const newItemForm = this.fb.group({
      tipo: ['producto', Validators.required],
      productoId: [null],
      servicioId: [null],
      descripcion: ['', Validators.required],
      cantidad: [1, [Validators.required, Validators.min(1)]],
      precio_unitario: [0, [Validators.required, Validators.min(0)]],
      descuento: [0, [Validators.min(0), Validators.max(100)]],
      subtotal: [0],
      impuestos: this.fb.array([]),
      impuestosTotal: [0],
      total: [0]
    });
    
    this.items.push(newItemForm);
    this.setupItemFilters(this.items.length - 1);
    this.initItemImpuestos(this.items.length - 1);
  }

  private setupItemFilters(index: number) {
    const itemForm = this.items.at(index);
    const tipoControl = itemForm.get('tipo');
    
    if (tipoControl) {
      this.filteredItems[index] = tipoControl.valueChanges.pipe(
        startWith(tipoControl.value),
        switchMap(tipo => {
          if (tipo === 'producto') {
            return this.productService.getProducts() as Observable<Product[]>;
          } else {
            return this.serviceService.getServices() as Observable<Service[]>;
          }
        }),
        map(items => this._filterItems(items, ''))
      );
    }
  }

  private _filterItems(items: (Product | Service)[], value: string | null): (Product | Service)[] {
    const filterValue = (value || '').toLowerCase();
    return items.filter(item => 
      item.name.toLowerCase().includes(filterValue)
    );
  }

  private initItemImpuestos(itemIndex: number) {
    const itemForm = this.items.at(itemIndex);
    const impuestosArray = itemForm.get('impuestos') as FormArray;
    
    while (impuestosArray.length > 0) {
      impuestosArray.removeAt(0);
    }
    
    this.impuestosList.forEach(impuesto => {
      impuestosArray.push(this.fb.group({
        id: [impuesto.id],
        alias: [impuesto.alias],
        tipo_impuesto: [impuesto.tipo_impuesto],
        impuesto: [impuesto.impuesto],
        tasa: [impuesto.tasa],
        selected: [false]
      }));
    });
  }

  onTipoChange(index: number) {
    const itemForm = this.items.at(index);
    const tipo = itemForm.get('tipo')?.value;
    
    if (tipo === 'producto') {
      itemForm.patchValue({
        servicioId: null
      });
    } else {
      itemForm.patchValue({
        productoId: null
      });
    }
    
    this.setupItemFilters(index);
  }

  onItemSelect(event: any, index: number) {
    const selectedId = event.value;
    const itemForm = this.items.at(index);
    const tipo = itemForm.get('tipo')?.value;
    
    if (tipo === 'producto') {
      this.productService.getProducts().subscribe((products: Product[]) => {
        const selectedProduct = products.find(p => p.id === selectedId);
        if (selectedProduct) {
          itemForm.patchValue({
            descripcion: selectedProduct.name,
            precio_unitario: selectedProduct.price,
          });
          this.calcularItemTotal(index);
        }
      });
    } else {
      this.serviceService.getServices().subscribe((services: Service[]) => {
        const selectedService = services.find(s => s.id === selectedId);
        if (selectedService) {
          itemForm.patchValue({
            descripcion: selectedService.name,
            precio_unitario: selectedService.price,
          });
          this.calcularItemTotal(index);
        }
      });
    }
  }

  removeItem(index: number) {
    this.items.removeAt(index);
    this.calcularTotales();
  }

  calcularItemTotal(index: number) {
    const itemForm = this.items.at(index);
    const cantidad = itemForm.get('cantidad')?.value || 0;
    const precioUnitario = itemForm.get('precio_unitario')?.value || 0;
    const descuento = itemForm.get('descuento')?.value || 0;
    
    const subtotalSinDescuento = cantidad * precioUnitario;
    const montoDescuento = subtotalSinDescuento * (descuento / 100);
    const subtotal = subtotalSinDescuento - montoDescuento;
    
    itemForm.patchValue({
      subtotal: subtotal
    });
    
    this.calcularItemImpuestos(index);
    this.calcularTotales();
  }
  
  calcularItemImpuestos(index: number) {
    const itemForm = this.items.at(index);
    const subtotal = itemForm.get('subtotal')?.value || 0;
    const impuestosArray = itemForm.get('impuestos') as FormArray;
    
    let impuestosTotal = 0;
    
    for (let i = 0; i < impuestosArray.length; i++) {
      const impuestoControl = impuestosArray.at(i);
      if (impuestoControl.get('selected')?.value) {
        const tasaImpuesto = impuestoControl.get('tasa')?.value || 0;
        const montoImpuesto = subtotal * tasaImpuesto;
        impuestosTotal += montoImpuesto;
      }
    }
    
    itemForm.patchValue({
      impuestosTotal: impuestosTotal,
      total: subtotal + impuestosTotal
    });
    
    return impuestosTotal;
  }

  calcularTotales() {
    let subtotal = 0;
    let impuestosTotal = 0;
    let total = 0;
    
    this.items.controls.forEach((itemControl: AbstractControl) => {
      subtotal += itemControl.get('subtotal')?.value || 0;
      impuestosTotal += itemControl.get('impuestosTotal')?.value || 0;
      total += itemControl.get('total')?.value || 0;
    });
    
    this.cotizacionForm.patchValue({
      subtotal: subtotal,
      impuestos: impuestosTotal,
      total: total
    });
    
    return total;
  }

  private patchForm(cotizacion: any) {
  this.apibizService.getClients().subscribe(clients => {
    const cliente = clients.find(c => c.ID === cotizacion.clienteId);
    if (cliente) {
      this.clienteSeleccionado = cliente;
      this.cotizacionForm.patchValue({
  clienteId: cotizacion.clienteId,
  // ✨ AGREGAR ESTOS CAMPOS SI VIENEN EN LA COTIZACIÓN
  clienteNombre: cotizacion.clienteNombre || '',
  clienteRfc: cotizacion.clienteRfc || '',
  clienteDireccion: cotizacion.clienteDireccion || '',
  clienteCiudad: cotizacion.clienteCiudad || '',
  clienteTelefono: cotizacion.clienteTelefono || '',
  // FIN DE CAMPOS NUEVOS
  sucursalId: cotizacion.sucursalId || null,
  fechaValidez: new Date(cotizacion.fechaValidez),
  estado: cotizacion.estado,
  moneda: cotizacion.moneda,
  observaciones: cotizacion.observaciones || '',
  subtotal: cotizacion.subtotal,
  impuestos: cotizacion.impuestos,
  total: cotizacion.total
});
    }
  });
    
    this.cotizacionForm.patchValue({
      clienteId: cotizacion.clienteId,
      sucursalId: cotizacion.sucursalId || null,
      fechaValidez: new Date(cotizacion.fechaValidez),
      estado: cotizacion.estado,
      moneda: cotizacion.moneda,
      observaciones: cotizacion.observaciones || '',
      subtotal: cotizacion.subtotal,
      impuestos: cotizacion.impuestos,
      total: cotizacion.total
    });

    if (cotizacion.sucursalId) {
      const sucursal = this.sucursales.find(s => s.id === cotizacion.sucursalId);
      this.selectedSucursal = sucursal || null;
    }

    while (this.items.length > 0) {
      this.items.removeAt(0);
    }

    if (cotizacion.items?.length) {
      cotizacion.items.forEach((item: any) => {
        const itemForm = this.fb.group({
          tipo: [item.tipo || 'producto', Validators.required],
          productoId: [item.tipo === 'producto' ? item.productoId : null],
          servicioId: [item.tipo === 'servicio' ? item.servicioId : null],
          descripcion: [item.descripcion || '', Validators.required],
          cantidad: [item.cantidad || 1, [Validators.required, Validators.min(1)]],
          precio_unitario: [item.precioUnitario || 0, [Validators.required, Validators.min(0)]],
          descuento: [item.descuento || 0, [Validators.min(0), Validators.max(100)]],
          subtotal: [item.subtotal || 0],
          impuestos: this.fb.array([]),
          impuestosTotal: [item.impuestos || 0],
          total: [item.total || 0]
        });

        this.items.push(itemForm);
        this.setupItemFilters(this.items.length - 1);
      });
      
      setTimeout(() => {
        cotizacion.items.forEach((item: any, index: number) => {
          this.initItemImpuestos(index);
          
          if (item.impuestosSeleccionados && Array.isArray(item.impuestosSeleccionados) && this.impuestosList.length > 0) {
            const impuestosArray = this.items.at(index).get('impuestos') as FormArray;
            
            item.impuestosSeleccionados.forEach((itemImpuesto: any) => {
              const impuestoIndex = this.impuestosList.findIndex(imp => imp.id === itemImpuesto.id);
              if (impuestoIndex >= 0 && impuestosArray.length > impuestoIndex) {
                const impuestoForm = impuestosArray.at(impuestoIndex);
                impuestoForm.patchValue({
                  selected: true
                });
              }
            });
            
            this.calcularItemImpuestos(index);
          }
        });
      }, 500);
    } else {
      this.addItem();
    }
    
    this.calcularTotales();
  }

  isValid(): boolean {
    return this.cotizacionForm.valid && this.items.length > 0;
  }

  guardarCotizacion() {
    if (!this.isValid()) {
      return;
    }
    
    const formValue = this.cotizacionForm.value;
    
    const items = this.items.controls.map((itemControl, index) => {
      const impuestosSeleccionados = this.getImpuestosSeleccionados(index);
      const tipo = itemControl.get('tipo')?.value;
      
      return {
        tipo: tipo,
        producto_id: tipo === 'producto' ? itemControl.get('productoId')?.value : undefined,  // ✅ snake_case
        servicio_id: tipo === 'servicio' ? itemControl.get('servicioId')?.value : undefined,  // ✅ snake_case
        descripcion: itemControl.get('descripcion')?.value,
        cantidad: itemControl.get('cantidad')?.value,
        precio_unitario: itemControl.get('precio_unitario')?.value,  // ✅ snake_case
        descuento: itemControl.get('descuento')?.value,
        subtotal: itemControl.get('subtotal')?.value,
        impuestos: itemControl.get('impuestosTotal')?.value,
        impuestos_seleccionados: impuestosSeleccionados,  // ✅ snake_case
        total: itemControl.get('total')?.value
      };
    });
    
    const cotizacionData = {
  usuario_id: formValue.usuarioId,
  cliente_id: formValue.clienteId,
  
  // ✨ DATOS COMPLETOS DEL CLIENTE
  cliente_nombre: this.clienteSeleccionado?.nombre || formValue.clienteNombre,
  cliente_rfc: this.clienteSeleccionado?.Rfc || formValue.clienteRfc,
  cliente_direccion: this.clienteSeleccionado?.direccion || formValue.clienteDireccion || '',
  cliente_ciudad: this.clienteSeleccionado?.ciudad || formValue.clienteCiudad || '',
  cliente_telefono: this.clienteSeleccionado?.Telefono || formValue.clienteTelefono || '',
  
  sucursal_id: formValue.sucursalId || null,
  fecha_validez: formValue.fechaValidez,
  estado: formValue.estado,
  moneda: formValue.moneda,
  observaciones: formValue.observaciones,
  items: items,
  subtotal: formValue.subtotal,
  impuestos: formValue.impuestos,
  total: formValue.total
};
    
    console.log('📦 Datos de cotización a guardar:', cotizacionData);
    console.log('🏢 Sucursal ID:', cotizacionData.sucursal_id);
    console.log('👤 Usuario ID:', cotizacionData.usuario_id);
    
    this.dialogRef.close(cotizacionData);
  }

  onCancel() {
    this.dialogRef.close();
  }
}