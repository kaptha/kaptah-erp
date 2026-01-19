import { Component, Inject, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, FormControl, Validators, AbstractControl } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { CFDIService } from '../../../services/cfdi.service';
import { ApibizService } from '../../../services/apibiz.service';
import { SucursalesService } from '../../../services/sucursales.service'; // ✨ NUEVO
import { Observable, of, Subject } from 'rxjs';
import { map, startWith, takeUntil } from 'rxjs/operators';
import { CFDIPago, CatalogoPago } from '../../../models/cfdi-pago.model'; // O donde tengas definida la interfaz
import { Cliente } from '../../../models/cliente.model';
import { Sweetalert } from '../../../functions';

@Component({
    selector: 'app-add-cfdi-pago-modal',
    templateUrl: './add-cfdi-pago-modal.component.html',
    styleUrls: ['./add-cfdi-pago-modal.component.css'],
    standalone: false
})
export class AddCfdiPagoModalComponent implements OnInit, OnDestroy {
  cfdiForm: FormGroup;
  activeTab = 'General'; // 'General' o 'Pagos'
  loading = false;
  isEditing = false;
  
  // Filtros y observables
  clienteFilterCtrl = new FormControl('');
  filteredClientes!: Observable<Cliente[]>;
  
  // Data
  selectedCliente: Cliente | null = null;
  
  // ✨ NUEVO: Sucursales
  sucursales: any[] = [];
  loadingSucursales = false;
  
  // Catálogos
  formasPago: CatalogoPago[] = [
    { clave: '01', descripcion: 'Efectivo' },
    { clave: '02', descripcion: 'Cheque nominativo' },
    { clave: '03', descripcion: 'Transferencia electrónica de fondos' },
    { clave: '04', descripcion: 'Tarjeta de crédito' },
    { clave: '28', descripcion: 'Tarjeta de débito' },
    { clave: '29', descripcion: 'Tarjeta de servicios' },
    { clave: '99', descripcion: 'Por definir' }
  ];
  
  monedas: CatalogoPago[] = [
    { clave: 'MXN', descripcion: 'Peso Mexicano' },
    { clave: 'USD', descripcion: 'Dólar Americano' },
    { clave: 'EUR', descripcion: 'Euro' }
  ];
  
  tiposCadenaPago: CatalogoPago[] = [
    { clave: '01', descripcion: 'SPEI' },
    { clave: '02', descripcion: 'Cheque' },
    { clave: '03', descripcion: 'Transferencia bancaria' },
    { clave: '04', descripcion: 'Tarjeta de crédito' },
    { clave: '05', descripcion: 'Monedero electrónico' },
    { clave: '06', descripcion: 'Dinero electrónico' },
    { clave: '07', descripcion: 'Tarjeta digital' },
    { clave: '08', descripcion: 'Vales de despensa' },
    { clave: '09', descripcion: 'Bienes' },
    { clave: '10', descripcion: 'Servicios' },
    { clave: '11', descripcion: 'Por definir' },
    { clave: '12', descripcion: 'Compensación' },
    { clave: '13', descripcion: 'Novación' },
    { clave: '14', descripcion: 'Confusión' },
    { clave: '15', descripcion: 'Remisión de deuda' },
    { clave: '16', descripcion: 'Prescripción o caducidad' },
    { clave: '17', descripcion: 'A satisfacción del acreedor' },
    { clave: '98', descripcion: 'NA' },
    { clave: '99', descripcion: 'Otros' }
  ];
  
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<AddCfdiPagoModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private cfdiService: CFDIService,
    private apibizService: ApibizService,
    private sucursalesService: SucursalesService // ✨ NUEVO
  ) {
    this.isEditing = data?.isEditing || false;
    
    // Inicializar el formulario
    this.cfdiForm = this.fb.group({
      // Datos generales
      ID: [null],
      serie: ['A', Validators.required],
      folio: [{ value: '', disabled: true }],
      fecha: [new Date(), Validators.required],
      tipo: ['Pago', Validators.required],
      
      // Datos de emisor
      sucursal: [null, Validators.required], // ✨ CAMBIADO: Ahora es requerido y dinámico
      tipoDocumento: ['Recepción de pago', Validators.required],
      regimenFiscal: ['P. Física con actividad empres. y prof.', Validators.required],
      
      // Datos del cliente receptor
      clienteId: [null, Validators.required],
      
      // Pagos
      pagos: this.fb.array([]),
      
      // Datos adicionales
      observaciones: ['']
    });
  }

  ngOnInit(): void {
    this.loadClientes();
    this.loadSucursales(); // ✨ NUEVO
    
    // Si es edición, cargamos los datos del CFDI
    if (this.isEditing && this.data) {
      this.populateForm(this.data);
    } else {
      // Agregamos un pago vacío
      this.addPago();
    }
    
    // Suscripción a cambios en los pagos para calcular totales
    this.pagos.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.calcularTotal();
      });
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  // Carga los clientes desde el servicio
  loadClientes() {
    this.loading = true;
    this.apibizService.getClients()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (clientes) => {
          // Configurar el filtro de clientes
          this.filteredClientes = this.clienteFilterCtrl.valueChanges.pipe(
            startWith(''),
            map(value => this._filterClientes(clientes, value))
          );
          this.loading = false;
        },
        error: (error) => {
          console.error('Error al cargar clientes:', error);
          Sweetalert.fnc('error', 'Error al cargar los clientes', null);
          this.loading = false;
        }
      });
  }
  
  // Filtro de clientes
  private _filterClientes(clientes: Cliente[], value: string | null): Cliente[] {
    const filterValue = (value || '').toLowerCase();
    return clientes.filter(cliente => 
      cliente.nombre?.toLowerCase().includes(filterValue) ||
      cliente.Rfc?.toLowerCase().includes(filterValue)
    );
  }
  
  // ✨ NUEVO: Cargar todas las sucursales disponibles
  loadSucursales(): void {
    this.loadingSucursales = true;
    this.sucursalesService.getSucursales()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
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
  
  // Evento al seleccionar un cliente
  onClienteSelect(event: any) {
    const selectedClienteId = event.value;
    if (this.filteredClientes) {
      this.filteredClientes.subscribe(clientes => {
        const selectedCliente = clientes.find(
          cliente => cliente.ID === selectedClienteId
        );
        if (selectedCliente) {
          this.selectedCliente = selectedCliente;
        }
      });
    }
  }
  
  // Getters para acceder a los FormArrays
  get pagos(): FormArray {
    return this.cfdiForm.get('pagos') as FormArray;
  }
  
  // Crear un pago nuevo
  createPago(): FormGroup {
    return this.fb.group({
      formaPago: ['03', Validators.required], // Transferencia por defecto
      fechaPago: [new Date(), Validators.required],
      moneda: ['MXN', Validators.required], // Peso Mexicano por defecto
      monto: [0, [Validators.required, Validators.min(0.01)]],
      rfcEmisorCuenta: [''],
      rfcBeneficiario: [''],
      numeroCuentaOrdenante: [''],
      numeroCuentaBeneficiario: [''],
      nombreBancoOrdenante: [''],
      numeroOperacion: [''],
      tipoCadenaPago: [''] // Opcional
    });
  }
  
  // Añadir un nuevo pago
  addPago(): void {
    const pagoForm = this.createPago();
    this.pagos.push(pagoForm);
  }
  
  // Eliminar un pago
  removePago(index: number): void {
    this.pagos.removeAt(index);
    this.calcularTotal();
  }
  
  // Calcular el total
  calcularTotal(): void {
    let total = 0;
    
    // Sumar todos los montos de los pagos
    this.pagos.controls.forEach((control: AbstractControl) => {
      total += control.get('monto')?.value || 0;
    });
    
    // No necesitamos actualizar ningún campo específico de total en este formulario
    // ya que cada pago tiene su propio monto y no hay un total general a calcular
  }
  
  // Cambiar de pestaña
  changeTab(tab: string): void {
    this.activeTab = tab;
  }
  
  // Función auxiliar para verificar formularios
  isInvalid(controlName: string): boolean {
    const control = this.cfdiForm.get(controlName);
    return control ? control.invalid && (control.dirty || control.touched) : false;
  }
  
  // Función auxiliar para verificar formularios anidados
  isPagoInvalid(index: number, controlName: string): boolean {
    const pagoForm = this.pagos.at(index);
    if (!pagoForm) return false;
    
    const control = pagoForm.get(controlName);
    return control ? control.invalid && (control.dirty || control.touched) : false;
  }
  
  // Poblar el formulario con datos existentes (para edición)
  populateForm(cfdi: CFDIPago): void {
    // Datos generales
    this.cfdiForm.patchValue({
      ID: cfdi.ID,
      serie: cfdi.serie,
      fecha: cfdi.fecha,
      tipo: cfdi.tipo,
      tipoDocumento: cfdi.tipoDocumento,
      regimenFiscal: cfdi.regimenFiscal,
      observaciones: cfdi.observaciones
    });
    
    // Datos del cliente
    this.apibizService.getClients().subscribe(clientes => {
      const cliente = clientes.find(c => c.ID === cfdi.cliente.ID);
      if (cliente) {
        this.selectedCliente = cliente;
        this.cfdiForm.patchValue({
          clienteId: cliente.ID
        });
      }
    });
    
    // Pagos
    if (cfdi.pagos && cfdi.pagos.length > 0) {
      // Limpiar el array existente
      while (this.pagos.length !== 0) {
        this.pagos.removeAt(0);
      }
      
      // Añadir cada pago
      cfdi.pagos.forEach(pago => {
        const pagoForm = this.createPago();
        pagoForm.patchValue({
          formaPago: pago.formaPago,
          fechaPago: pago.fechaPago,
          moneda: pago.moneda,
          monto: pago.monto,
          rfcEmisorCuenta: pago.rfcEmisorCuenta || '',
          rfcBeneficiario: pago.rfcBeneficiario || '',
          numeroCuentaOrdenante: pago.numeroCuentaOrdenante || '',
          numeroCuentaBeneficiario: pago.numeroCuentaBeneficiario || '',
          nombreBancoOrdenante: pago.nombreBancoOrdenante || '',
          numeroOperacion: pago.numeroOperacion || '',
          tipoCadenaPago: pago.tipoCadenaPago || ''
        });
        this.pagos.push(pagoForm);
      });
    } else {
      this.addPago(); // Agregar un pago vacío
    }
  }
  
  // Enviar el formulario
  onSubmit(): void {
    if (this.cfdiForm.invalid) {
      Sweetalert.fnc('error', 'Por favor, completa todos los campos requeridos', null);
      this.markFormGroupTouched(this.cfdiForm);
      return;
    }
    
    // Preparar datos para enviar
    const cfdiData = this.prepareCFDIData();
    
    // Cerrar el diálogo y enviar datos
    this.dialogRef.close(cfdiData);
  }
  
  // Preparar datos para enviar
  prepareCFDIData(): any {
    const formValue = this.cfdiForm.getRawValue();
    
    return {
      ...formValue,
      cliente: {
        ID: this.selectedCliente?.ID,
        nombre: this.selectedCliente?.nombre,
        rfc: this.selectedCliente?.Rfc
      }
      // Otros datos necesarios según tu modelo
    };
  }
  
  // Marcar todos los campos como touched para mostrar errores
  markFormGroupTouched(formGroup: FormGroup | FormArray): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      if (control instanceof FormGroup || control instanceof FormArray) {
        this.markFormGroupTouched(control);
      } else {
        control?.markAsTouched();
      }
    });
  }
  
  // Cerrar el diálogo sin guardar
  onCancel(): void {
    this.dialogRef.close();
  }
}
