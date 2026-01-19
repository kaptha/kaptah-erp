import { Component, OnInit, Inject, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, FormControl, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CfdiApiService } from '../../../services/cfdi-api.service';
import { ApibizService } from '../../../services/apibiz.service'; // ✅ IMPORTAR
import { AccountsPayableService, CreateAccountPayableDto, UpdateAccountPayableDto } from '../../../services/accounts-payable.service';
import { Proveedor } from '../../../models/proveedor.model'; // ✅ IMPORTAR
import { Observable, ReplaySubject, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import Swal from 'sweetalert2';

@Component({
    selector: 'app-pago-form-modal',
    templateUrl: './pago-form-modal.component.html',
    styleUrls: ['./pago-form-modal.component.css'],
    standalone: false
})
export class PagoFormModalComponent implements OnInit, OnDestroy {
  pagoForm: FormGroup;
  isEditMode = false;
  loading = false;
  
  // Datos del usuario
  currentUserId: string = '';
  
  // Proveedores - ✅ USAR TIPO CORRECTO
  providers: Proveedor[] = [];
  filteredProviders: ReplaySubject<Proveedor[]> = new ReplaySubject<Proveedor[]>(1);
  providerFilterCtrl: FormControl = new FormControl('');
  providersLoaded = false;
  selectedProvider: Proveedor | null = null;
  
  // CFDIs
  availableCfdis: any[] = [];
  filteredCfdis: any[] = [];
  selectedCfdi: any = null;
  cfdisLoaded = true;
  
  // Flags de visibilidad
  showCfdiSelector = false;
  showDocumentIdInput = false;
  
  // Opciones para selects
  documentTypes = [
    { value: 'CFDI', label: 'CFDI (Factura Electrónica)' },
    { value: 'Factura', label: 'Factura' },
    { value: 'Recibo', label: 'Recibo' },
    { value: 'Nota', label: 'Nota' },
    { value: 'Otro', label: 'Otro' }
  ];
  
  conceptOptions = [
    'Compra de mercancía',
    'Servicios profesionales',
    'Materiales y suministros',
    'Equipo y maquinaria',
    'Mantenimiento y reparaciones',
    'Servicios públicos',
    'Arrendamiento',
    'Transporte y logística',
    'Otro'
  ];
  
  creditDaysOptions = [
    { value: 0, label: 'Contado' },
    { value: 15, label: '15 días' },
    { value: 30, label: '30 días' },
    { value: 45, label: '45 días' },
    { value: 60, label: '60 días' },
    { value: 90, label: '90 días' }
  ];

  private _onDestroy = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<PagoFormModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private cfdiApiService: CfdiApiService,
    private apibizService: ApibizService, // ✅ INYECTAR
    private accountsPayableService: AccountsPayableService
  ) {
    this.pagoForm = this.fb.group({
      selectedProviderId: [''],
      providerId: ['', Validators.required],
      providerName: ['', Validators.required],
      providerRfc: ['', Validators.required],
      documentType: ['CFDI', Validators.required],
      documentId: [''],
      documentNumber: [''],
      documentReference: [''],
      concept: ['', Validators.required],
      totalAmount: [0, [Validators.required, Validators.min(0.01)]],
      creditDays: [30, Validators.required],
      issueDate: [new Date(), Validators.required],
      dueDate: [new Date(), Validators.required],
      notes: ['']
    });
  }

  ngOnInit(): void {
    console.log('🔹 Inicializando PagoFormModalComponent...');
    
    this.initializeUser();
    
    if (this.data && this.data.pago) {
      this.isEditMode = true;
      this.loadPagoData(this.data.pago);
    }

    if (this.currentUserId) {
      this.loadProviders(); // ✅ Ahora usa ApibizService
    }

    this.setupProviderFilter();
    this.setupFormListeners();
  }

  ngOnDestroy(): void {
    this._onDestroy.next();
    this._onDestroy.complete();
  }

  private setupFormListeners(): void {
    this.pagoForm.get('documentType')?.valueChanges
      .pipe(takeUntil(this._onDestroy))
      .subscribe(documentType => {
        this.onDocumentTypeChange(documentType);
      });

    this.pagoForm.get('issueDate')?.valueChanges
      .pipe(takeUntil(this._onDestroy))
      .subscribe(() => this.calculateDueDate());
    
    this.pagoForm.get('creditDays')?.valueChanges
      .pipe(takeUntil(this._onDestroy))
      .subscribe(() => this.calculateDueDate());
  }

  private initializeUser(): void {
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        if (user && user.uid) {
          this.currentUserId = user.uid;
          console.log('✅ Usuario autenticado:', this.currentUserId);
        } else {
          console.error('❌ Usuario sin UID');
          this.showError('No se pudo obtener el ID del usuario');
        }
      } else {
        console.error('❌ No hay usuario en localStorage');
        this.showError('Usuario no autenticado');
      }
    } catch (error) {
      console.error('❌ Error parseando usuario:', error);
      this.showError('Error al obtener datos del usuario');
    }
  }

  private setupProviderFilter(): void {
    this.providerFilterCtrl.valueChanges
      .pipe(takeUntil(this._onDestroy))
      .subscribe(() => {
        this.filterProviders();
      });
  }

  private filterProviders(): void {
    if (!this.providers) {
      return;
    }

    let search = this.providerFilterCtrl.value;
    if (!search) {
      this.filteredProviders.next(this.providers.slice());
      return;
    }

    search = search.toLowerCase();
    this.filteredProviders.next(
      this.providers.filter(provider =>
        provider.nombre.toLowerCase().includes(search) ||
        provider.rfc.toLowerCase().includes(search)
      )
    );
  }

  private loadPagoData(pago: any): void {
    this.pagoForm.patchValue({
      selectedProviderId: pago.providerId,
      providerId: pago.providerId,
      providerName: pago.providerName,
      providerRfc: pago.providerRfc,
      documentType: pago.documentType || 'CFDI',
      documentId: pago.documentId,
      concept: pago.concept,
      totalAmount: pago.totalAmount || pago.amount,
      creditDays: pago.creditDays || 30,
      issueDate: pago.issueDate,
      dueDate: pago.dueDate,
      notes: pago.notes
    });
  }

  // ✅ MODIFICADO: Cargar proveedores desde ApibizService
  private loadProviders(): void {
    if (!this.currentUserId) {
      console.error('❌ No hay usuario autenticado para cargar proveedores');
      return;
    }

    console.log('📋 Cargando proveedores desde ApibizService...');
    this.providersLoaded = false;
    
    this.apibizService.getProveedores().subscribe({
      next: (proveedores) => {
        this.providers = proveedores;
        this.filteredProviders.next(this.providers.slice());
        this.providersLoaded = true;
        console.log('✅ Proveedores cargados:', this.providers.length);
      },
      error: (error) => {
        console.error('❌ Error cargando proveedores:', error);
        this.providersLoaded = true;
        this.showError('Error al cargar proveedores');
      }
    });
  }

  onProviderSelect(event: any): void {
  const providerId = event.value;
  
  if (!providerId) {
    return;
  }

  console.log('🔍 Proveedor seleccionado ID:', providerId);
  
  const provider = this.providers.find(p => p.ID === providerId);
  if (provider) {
    this.selectedProvider = provider;
    this.pagoForm.patchValue({
      providerId: provider.ID,
      providerName: provider.nombre,
      providerRfc: provider.rfc
    });
    
    console.log('✅ Proveedor seleccionado, RFC:', provider.rfc);
    
    const currentDocType = this.pagoForm.get('documentType')?.value;
    console.log('📄 Tipo de documento actual:', currentDocType);
    
    if (currentDocType === 'CFDI') {
      // ✅ IMPORTANTE: Activar el flag ANTES de cargar
      this.showCfdiSelector = false; // Reset primero
      this.showDocumentIdInput = false;
      
      // Cargar CFDIs
      this.loadCfdisByProviderRfc(provider.rfc);
    }
  }
}

  private loadCfdisByProviderRfc(providerRfc: string): void {
  if (!providerRfc) {
    this.filteredCfdis = [];
    this.cfdisLoaded = true;
    this.showCfdiSelector = false; // ✅ AGREGAR
    return;
  }

  console.log(`🔍 Cargando CFDIs de egresos para proveedor RFC: ${providerRfc}`);
  this.cfdisLoaded = false;
  this.showCfdiSelector = false; // ✅ Ocultar mientras carga
  
  this.cfdiApiService.busquedaRapidaEgresos({
    query: '',
    offset: 0,
    limit: 1000
  }).subscribe({
    next: (response) => {
      console.log('📦 Respuesta completa:', response);
      
      let cfdisArray: any[] = [];
      
      if (Array.isArray(response)) {
        cfdisArray = response;
      } else if (response && typeof response === 'object') {
        cfdisArray = response.data || response.results || response.cfdis || response.items || [];
      }
      
      console.log(`📊 Total CFDIs obtenidos: ${cfdisArray.length}`);
      
      // Filtrar por RFC del emisor (proveedor)
      this.filteredCfdis = cfdisArray.filter(cfdi => 
        cfdi.rfc_emisor === providerRfc
      );
      
      this.cfdisLoaded = true;
      
      console.log(`✅ CFDIs filtrados para ${providerRfc}:`, this.filteredCfdis.length);
      
      // ✅ ACTIVAR EL SELECTOR SI HAY CFDIs
      if (this.filteredCfdis.length > 0) {
        this.showCfdiSelector = true; // ✅ IMPORTANTE: Mostrar selector
        console.log('✅ Selector de CFDI activado');
        console.log('📋 Primer CFDI encontrado:', this.filteredCfdis[0]);
      } else {
        this.showCfdiSelector = false;
        console.log(`⚠️ No se encontraron CFDIs para el proveedor ${providerRfc}`);
        Swal.fire({
          icon: 'info',
          title: 'Sin facturas',
          text: `No se encontraron facturas (CFDIs) del proveedor seleccionado.`,
          timer: 3000,
          showConfirmButton: false
        });
      }
    },
    error: (error) => {
      console.error('❌ Error loading CFDIs:', error);
      this.filteredCfdis = [];
      this.cfdisLoaded = true;
      this.showCfdiSelector = false; // ✅ AGREGAR
      
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Error al cargar las facturas. Por favor, intente de nuevo.',
        confirmButtonText: 'OK'
      });
    }
  });
}

  private onDocumentTypeChange(documentType: string): void {
    console.log('📄 Tipo de documento seleccionado:', documentType);
    
    this.pagoForm.patchValue({
      documentId: '',
      totalAmount: 0,
      concept: ''
    });
    this.selectedCfdi = null;
    this.filteredCfdis = [];
    
    this.showCfdiSelector = false;
    this.showDocumentIdInput = false;
    
    if (!this.selectedProvider) {
      console.log('⚠️ Debe seleccionar un proveedor primero');
      return;
    }

    if (documentType === 'CFDI') {
      this.loadCfdisByProviderRfc(this.selectedProvider.rfc);
      this.showCfdiSelector = true;
    } else {
      this.showDocumentIdInput = true;
    }
  }

  shouldShowCfdiSelector(): boolean {
  const result = this.showCfdiSelector && this.filteredCfdis.length > 0;
  console.log('🔍 shouldShowCfdiSelector:', {
    showCfdiSelector: this.showCfdiSelector,
    filteredCfdisLength: this.filteredCfdis.length,
    result: result
  });
  return result;
}

  onCfdiSelect(cfdiId: string): void {
    console.log('💰 CFDI seleccionado ID:', cfdiId);
    
    const selectedCfdi = this.filteredCfdis.find(cfdi => cfdi.id === Number(cfdiId));
    if (selectedCfdi) {
      this.selectedCfdi = selectedCfdi;
      
      console.log('📄 CFDI completo seleccionado:', selectedCfdi);
      
      this.pagoForm.patchValue({
        documentId: cfdiId,
        totalAmount: selectedCfdi.total,
        issueDate: selectedCfdi.fecha ? new Date(selectedCfdi.fecha) : new Date(),
        concept: `Pago por factura ${this.getCfdiFolio(selectedCfdi)} - ${selectedCfdi.nombre_emisor}`
      });
      
      this.calculateDueDate();
      
      console.log('✅ Campos auto-rellenados desde CFDI');
    }
  }

  getCfdiFolio(cfdi: any): string {
    if (cfdi.serie && cfdi.folio) {
      return `${cfdi.serie}-${cfdi.folio}`;
    } else if (cfdi.folio) {
      return `Folio: ${cfdi.folio}`;
    } else if (cfdi.serie) {
      return `Serie: ${cfdi.serie}`;
    }
    return `ID: ${cfdi.id || 'N/A'}`;
  }

  formatCfdiInfo(cfdi: any): string {
    const folio = this.getCfdiFolio(cfdi);
    const total = this.formatCurrency(cfdi.total || 0);
    const fecha = cfdi.fecha ? 
      new Date(cfdi.fecha).toLocaleDateString('es-MX') : 'S/F';
    return `${folio} - ${total} - ${fecha}`;
  }

  onConceptSelect(concept: string): void {
    this.pagoForm.patchValue({ concept });
  }

  private calculateDueDate(): void {
    const issueDate = this.pagoForm.get('issueDate')?.value;
    const creditDays = this.pagoForm.get('creditDays')?.value || 0;

    if (issueDate) {
      const date = new Date(issueDate);
      date.setDate(date.getDate() + creditDays);
      this.pagoForm.patchValue({ dueDate: date }, { emitEvent: false });
    }
  }

  hasFieldError(fieldName: string): boolean {
    const field = this.pagoForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.pagoForm.get(fieldName);
    if (field?.hasError('required')) {
      return 'Este campo es requerido';
    }
    if (field?.hasError('min')) {
      return 'El valor debe ser mayor a 0';
    }
    return '';
  }

  onSubmit(): void {
    if (this.pagoForm.invalid) {
      Object.keys(this.pagoForm.controls).forEach(key => {
        this.pagoForm.get(key)?.markAsTouched();
      });
      
      Swal.fire({
        icon: 'warning',
        title: 'Formulario incompleto',
        text: 'Por favor complete todos los campos requeridos'
      });
      return;
    }

    if (!this.currentUserId) {
      this.showError('Usuario no autenticado');
      return;
    }

    this.loading = true;

    const formValue = this.pagoForm.value;
    
    const pagoData: CreateAccountPayableDto = {
      partnerId: Number(this.selectedProvider?.ID) || 1, // ✅ USAR ID del proveedor
      providerId: Number(this.selectedProvider?.ID) || 0,
      providerName: formValue.providerName,
      providerRfc: formValue.providerRfc,
      totalAmount: Number(formValue.totalAmount),
      creditDays: Number(formValue.creditDays),
      dueDate: formValue.dueDate instanceof Date ? 
        formValue.dueDate.toISOString().split('T')[0] : formValue.dueDate,
      issueDate: formValue.issueDate instanceof Date ? 
        formValue.issueDate.toISOString().split('T')[0] : formValue.issueDate,
      concept: formValue.concept,
      documentType: formValue.documentType,
      documentId: formValue.documentId,
      documentNumber: formValue.documentNumber,
      documentReference: formValue.documentReference,
      notes: formValue.notes
    };

    console.log('💾 Guardando pago:', pagoData);

    const operation = this.isEditMode
      ? this.accountsPayableService.update(this.data.pago.id, pagoData)
      : this.accountsPayableService.create(pagoData);

    operation.subscribe({
      next: (response) => {
        console.log('✅ Pago guardado:', response);
        Swal.fire({
          icon: 'success',
          title: this.isEditMode ? 'Pago actualizado' : 'Pago creado',
          text: `El pago se ha ${this.isEditMode ? 'actualizado' : 'creado'} correctamente`,
          timer: 2000,
          showConfirmButton: false
        });
        this.loading = false;
        this.dialogRef.close(true);
      },
      error: (error) => {
        console.error('❌ Error guardando pago:', error);
        this.loading = false;
        
        let errorMessage = `Error al ${this.isEditMode ? 'actualizar' : 'crear'} el pago`;
        
        if (typeof error === 'string') {
          errorMessage = error;
        } else if (error?.error?.message) {
          errorMessage = error.error.message;
        } else if (error?.message) {
          errorMessage = error.message;
        }
        
        this.showError(errorMessage);
      }
    });
  }

  onClose(): void {
    this.dialogRef.close(false);
  }

  onCancel(): void {
    this.onClose();
  }

  private showError(message: string): void {
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: message
    });
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  }
}