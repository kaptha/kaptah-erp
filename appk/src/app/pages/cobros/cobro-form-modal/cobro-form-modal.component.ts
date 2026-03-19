import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormControl, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { finalize } from 'rxjs/operators';
import { AccountsReceivableService, CreateAccountReceivableDto, UpdateAccountReceivableDto } from '../../../services/accounts-receivable.service';
import { ApibizService } from '../../../services/apibiz.service'; // Servicio para cargar clientes
import { CfdiApiService } from '../../../services/cfdi-api.service';
import { NoteService } from '../../../services/ventas/notes/note.service'; // ✅ NUEVO: Servicio de notas de venta
import { Cliente } from '../../../models/cliente.model'; // Modelo de cliente
import { SaleNote } from '../../../models/sale-note.model'; // ✅ NUEVO: Modelo de nota de venta
import { Sweetalert } from '../../../functions'; // Importar SweetAlert

interface CobroFormData {
  id?: string;
  customerId: string;
  customerName: string;
  customerRfc: string;
  totalAmount: number;
  creditDays: number;
  dueDate: string;
  documentId?: string;
  documentType?: string;
  concept?: string;
  notes?: string;
}

@Component({
    selector: 'app-cobro-form-modal',
    templateUrl: './cobro-form-modal.component.html',
    styleUrls: ['./cobro-form-modal.component.css'],
    standalone: false
})
export class CobroFormModalComponent implements OnInit {
  cobroForm!: FormGroup;
  loading = false;
  // Control para búsqueda de clientes
  customerFilterCtrl = new FormControl('');
  filteredCustomers!: Observable<Cliente[]>;
  selectedCustomer: Cliente | null = null;
  clientsLoaded = false;
  // Controles para notas de venta
  saleNotes: SaleNote[] = [];
  filteredSaleNotes: SaleNote[] = [];
  selectedSaleNote: SaleNote | null = null;
  notesLoaded = true;

  // Controles para CFDIs
  cfdis: any[] = [];
  filteredCfdis: any[] = [];
  selectedCfdi: any | null = null;
  cfdisLoaded = true;

  // ✅ NUEVAS PROPIEDADES BOOLEANAS para controlar la visibilidad
  showSaleNoteSelector = false;
  showCfdiSelector = false;
  showDocumentIdInput = false;

  // ✅ MODIFICADO: Lista de tipos de documento actualizada
  documentTypes = [
    { value: 'Factura', label: 'Factura' },
    { value: 'Nota de venta', label: 'Nota de venta' },
    { value: 'Otro', label: 'Otro' }
  ];

  creditDaysOptions = [
    { value: 15, label: '15 días' },
    { value: 30, label: '30 días' },
    { value: 45, label: '45 días' },
    { value: 60, label: '60 días' },
    { value: 90, label: '90 días' }
  ];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<CobroFormModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: CobroFormData | null,
    private accountsReceivableService: AccountsReceivableService,
    private apibizService: ApibizService,
    private noteService: NoteService,
    private cfdiApiService: CfdiApiService
  ) {
    this.createForm();
  }

  ngOnInit() {
    // Cargar clientes y notas de venta al inicializar
    this.loadCustomers();
      
    if (this.data) {
      this.patchForm(this.data);
    }
  }

  // Método para cargar clientes
  loadCustomers() {
    this.apibizService.getClients().subscribe({
      next: (clients) => {
        this.clientsLoaded = true;
        this.filteredCustomers = this.customerFilterCtrl.valueChanges.pipe(
          startWith(''),
          map(value => this._filterCustomers(clients, value))
        );
      },
      error: (error) => {
        console.error('Error loading customers:', error);
        Sweetalert.fnc('error', 'Error al cargar los clientes', null);
      }
    });
  }

 
  // Filtrar clientes por nombre o RFC
  private _filterCustomers(clients: Cliente[], value: string | null): Cliente[] {
    const filterValue = (value || '').toLowerCase();
    return clients.filter(customer => 
      customer.nombre.toLowerCase().includes(filterValue) ||
      customer.Rfc.toLowerCase().includes(filterValue)
    );
  }

  // Manejar selección de cliente
  onCustomerSelect(event: any) {
  console.log('🎯 onCustomerSelect triggered:', event);
  
  const selectedClientId = event.value;
  if (this.filteredCustomers) {
    this.filteredCustomers.subscribe(clients => {
      const selectedClient = clients.find(client => client.ID === selectedClientId);
      
      console.log('🔍 Cliente encontrado:', selectedClient);
      
      if (selectedClient) {
        this.selectedCustomer = selectedClient;
        
        // Auto-completar campos del cliente
        this.cobroForm.patchValue({
          customerId: selectedClient.ID,
          customerName: selectedClient.nombre,
          customerRfc: selectedClient.Rfc
        });

        console.log('✅ Cliente seleccionado, RFC:', selectedClient.Rfc);
        
        // ✅ CAMBIO IMPORTANTE: Solo cargar datos si ya hay un tipo de documento seleccionado
        const currentDocType = this.cobroForm.get('documentType')?.value;
        if (currentDocType === 'Nota de venta') {
          this.loadSaleNotesByCustomerRfc(selectedClient.Rfc);
        } else if (currentDocType === 'Factura') {
          this.loadCfdisByCustomerRfc(selectedClient.Rfc);
        }
      }
    });
  }
}

  

// ✅ NUEVO: Método para cargar notas de venta filtradas por RFC
private loadSaleNotesByCustomerRfc(customerRfc: string) {
  if (!customerRfc) {
    this.filteredSaleNotes = [];
    this.notesLoaded = true;
    return;
  }

  console.log(`🔍 Cargando notas de venta para RFC: ${customerRfc}`);
  this.notesLoaded = false;
  
  this.noteService.getAll().subscribe({
    next: (notes) => {
      this.filteredSaleNotes = notes.filter(note => 
        note.customerRfc === customerRfc
      );
      this.notesLoaded = true;
      
      console.log(`✅ Notas encontradas para ${customerRfc}:`, this.filteredSaleNotes.length);
      console.log('Notas filtradas:', this.filteredSaleNotes);
    },
    error: (error) => {
      console.error('❌ Error loading sale notes:', error);
      this.filteredSaleNotes = [];
      this.notesLoaded = true;
      Sweetalert.fnc('error', 'Error al cargar las notas de venta del cliente', null);
    }
  });
}

// ✅ MODIFICAR: Método para cargar CFDIs con detección de cambios
  private loadCfdisByCustomerRfc(customerRfc: string): void {
  if (!customerRfc) {
    this.filteredCfdis = [];
    this.cfdisLoaded = true;
    return;
  }

  console.log(`🔍 Cargando CFDIs para RFC: ${customerRfc}`);
  this.cfdisLoaded = false;

  this.cfdiApiService.buscarCfdisIngresos(customerRfc).subscribe({
    next: (response) => {
      const cfdisArray = response?.cfdis || [];

      this.filteredCfdis = cfdisArray.filter(cfdi =>
        cfdi.rfc_receptor === customerRfc
      );

      this.cfdisLoaded = true;

      console.log(`✅ CFDIs encontrados para ${customerRfc}:`, this.filteredCfdis.length);
    },
    error: (error) => {
      console.error('❌ Error loading CFDIs:', error);
      this.filteredCfdis = [];
      this.cfdisLoaded = true;
      Sweetalert.fnc('error', 'Error al cargar las facturas del cliente', null);
    }
  });
}
  // ✅ NUEVO: Manejar cambio en el tipo de documento
  onDocumentTypeChange(documentType: string) {
  console.log('📄 Tipo de documento seleccionado:', documentType);
  
  // Limpiar campos relacionados
  this.cobroForm.patchValue({
    documentId: '',
    totalAmount: 0,
    concept: 'Cuenta por cobrar'
  });
  this.selectedSaleNote = null;
  this.selectedCfdi = null;
  
  // Limpiar arrays
  this.filteredSaleNotes = [];
  this.filteredCfdis = [];
  
  // ✅ ACTUALIZAR FLAGS DE VISIBILIDAD
  this.showSaleNoteSelector = false;
  this.showCfdiSelector = false;
  this.showDocumentIdInput = false;
  
  if (!this.selectedCustomer) {
    console.log('⚠️ Debe seleccionar un cliente primero');
    return;
  }

  // Cargar datos según el tipo seleccionado
  if (documentType === 'Nota de venta') {
    this.loadSaleNotesByCustomerRfc(this.selectedCustomer.Rfc);
    this.showSaleNoteSelector = true; // ✅ Mostrar selector
  } else if (documentType === 'Factura') {
    this.loadCfdisByCustomerRfc(this.selectedCustomer.Rfc);
    this.showCfdiSelector = true; // ✅ Mostrar selector
  } else {
    this.showDocumentIdInput = true; // ✅ Mostrar input de texto
  }
}

  // ✅ NUEVO: Manejar selección de CFDI
  onCfdiSelect(cfdiId: string) {
  console.log('💰 CFDI seleccionado ID:', cfdiId);
  
  const selectedCfdi = this.filteredCfdis.find(cfdi => cfdi.id === Number(cfdiId));
  if (selectedCfdi) {
    this.selectedCfdi = selectedCfdi;
    
    console.log('📄 CFDI completo seleccionado:', selectedCfdi);
    
    // Auto-rellenar campos financieros
    this.cobroForm.patchValue({
      documentId: cfdiId,
      totalAmount: selectedCfdi.total,
      concept: `Cobro por factura ${this.getCfdiFolio(selectedCfdi)} - ${selectedCfdi.nombre_receptor}`
    });
    
    console.log('✅ Campos auto-rellenados:', {
      documentId: cfdiId,
      totalAmount: selectedCfdi.total,
      concept: `Cobro por factura ${this.getCfdiFolio(selectedCfdi)} - ${selectedCfdi.nombre_receptor}`
    });
  }
}

  // ✅ NUEVO: Método para obtener el folio completo del CFDI
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

  // ✅ NUEVO: Método para obtener el estado del CFDI en español
  getCfdiStatusText(status: string): string {
  switch (status) {
    case 'procesado': return 'Procesado';
    case 'pendiente': return 'Pendiente';
    case 'error': return 'Error';
    default: return status || 'N/A';
  }
}

  // ✅ NUEVO: Manejar selección de nota de venta
  onSaleNoteSelect(noteId: string) {
    console.log('Nota de venta seleccionada:', noteId);
    
    const selectedNote = this.filteredSaleNotes.find(note => note.id === noteId);
    if (selectedNote) {
      this.selectedSaleNote = selectedNote;
      
      // Auto-rellenar campos financieros
      this.cobroForm.patchValue({
        totalAmount: selectedNote.total,
        concept: `Cobro por nota de venta ${selectedNote.id} - ${selectedNote.customerName}`
      });
      
      console.log('Campos auto-rellenados:', {
        totalAmount: selectedNote.total,
        concept: `Cobro por nota de venta ${selectedNote.id} - ${selectedNote.customerName}`
      });
    }
  }

  // ✅ NUEVO: Obtener texto del estado
  getStatusText(status: string): string {
    switch (status) {
      case 'COMPLETED': return 'Completada';
      case 'PENDING': return 'Pendiente';
      case 'CANCELLED': return 'Cancelada';
      default: return status;
    }
  }

  
  createForm() {
  const today = new Date();
  const defaultDueDate = new Date(today.getTime() + (30 * 24 * 60 * 60 * 1000));

  this.cobroForm = this.fb.group({
    selectedCustomerId: [''],
    customerId: ['', [Validators.required]],
    customerName: ['', [Validators.required, Validators.minLength(3)]],
    customerRfc: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(13)]],
    totalAmount: [0, [Validators.required, Validators.min(0.01)]],
    creditDays: [30, [Validators.required, Validators.min(1)]],
    dueDate: [defaultDueDate, [Validators.required]],
    documentId: [''],
    documentType: ['Factura'],
    concept: ['Cuenta por cobrar'],
    notes: ['']
  });

  // Escuchar cambios en creditDays
  this.cobroForm.get('creditDays')?.valueChanges.subscribe(days => {
    if (days) {
      const newDueDate = new Date(today.getTime() + (days * 24 * 60 * 60 * 1000));
      this.cobroForm.get('dueDate')?.setValue(newDueDate, { emitEvent: false });
    }
  });

  // ✅ MODIFICADO: Escuchar cambios en el tipo de documento
  this.cobroForm.get('documentType')?.valueChanges.subscribe(documentType => {
    this.onDocumentTypeChange(documentType);
  });
}

  private patchForm(data: CobroFormData) {
    // Buscar el cliente por RFC para establecer la selección
    if (data.customerRfc && this.clientsLoaded) {
      this.apibizService.getClients().subscribe(clients => {
        const client = clients.find(c => c.Rfc === data.customerRfc);
        if (client) {
          this.selectedCustomer = client;
          this.cobroForm.patchValue({
            selectedCustomerId: client.ID
          });
        }
      });
    }

    this.cobroForm.patchValue({
      customerId: data.customerId,
      customerName: data.customerName,
      customerRfc: data.customerRfc,
      totalAmount: data.totalAmount,
      creditDays: data.creditDays,
      dueDate: new Date(data.dueDate),
      documentId: data.documentId || '',
      documentType: data.documentType || 'Factura',
      concept: data.concept || 'Cuenta por cobrar',
      notes: data.notes || ''
    });
  }

  generateUUIDs() {
  // ✅ ELIMINAR: No generar UUID para customerId
  // Solo generar UUID para documentId si no es nota de venta
  if (!this.cobroForm.get('documentId')?.value && this.cobroForm.get('documentType')?.value !== 'Nota de venta') {
    this.cobroForm.get('documentId')?.setValue(this.generateUUID());
  }
}

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

onSubmit() {
  if (this.cobroForm.valid) {
    this.loading = true;
    
    // ✅ VALIDACIÓN: Asegurar que se haya seleccionado un cliente
    if (!this.selectedCustomer) {
      Sweetalert.fnc('error', 'Por favor, selecciona un cliente válido', null);
      this.loading = false;
      return;
    }
    
    this.generateUUIDs();
    const formValue = this.cobroForm.value;
    
    if (this.data?.id) {
      // Edición
      const updateData: UpdateAccountReceivableDto = {
        customerId: Number(formValue.customerId), // ✅ ASEGURAR number
        customerName: formValue.customerName,
        customerRfc: formValue.customerRfc,
        totalAmount: Number(formValue.totalAmount), // ✅ CONVERTIR a number
        creditDays: Number(formValue.creditDays), // ✅ CONVERTIR a number
        dueDate: formValue.dueDate.toISOString().split('T')[0],
        documentId: formValue.documentId,
        documentType: formValue.documentType,
        concept: formValue.concept,
        notes: formValue.notes
      };

      console.log('Datos de actualización a enviar:', updateData);

      this.accountsReceivableService.update(this.data.id, updateData)
        .pipe(finalize(() => this.loading = false))
        .subscribe({
          next: (response) => {
            Sweetalert.fnc('success', 'Cuenta por cobrar actualizada correctamente', null);
            this.dialogRef.close(response);
          },
          error: (error) => {
            console.error('Error updating account receivable:', error);
            Sweetalert.fnc('error', 'Error al actualizar: ' + this.getErrorMessage(error), null);
          }
        });
    } else {
      // ✅ CREACIÓN CORREGIDA - ASEGURAR TIPOS NUMÉRICOS
      const createData: CreateAccountReceivableDto = {
        customerId: Number(formValue.customerId), // ✅ CONVERTIR a number
        customerName: String(formValue.customerName), // ✅ ASEGURAR string
        customerRfc: String(formValue.customerRfc), // ✅ ASEGURAR string
        totalAmount: Number(formValue.totalAmount), // ✅ CONVERTIR a number
        creditDays: Number(formValue.creditDays), // ✅ CONVERTIR a number
        dueDate: formValue.dueDate.toISOString().split('T')[0], // ✅ String ISO date
        concept: String(formValue.concept), // ✅ ASEGURAR string
        
        // Campos opcionales con conversiones correctas
        partnerId: Number(formValue.customerId), // ✅ CONVERTIR a number
        documentId: formValue.documentId ? String(formValue.documentId) : undefined,
        documentNumber: undefined,
        documentType: formValue.documentType ? String(formValue.documentType) : undefined,
        documentReference: undefined,
        issueDate: undefined,
        notes: formValue.notes ? String(formValue.notes) : undefined
      };

      // ✅ VALIDACIÓN ADICIONAL DE TIPOS
      console.log('Validando tipos antes de enviar:');
      console.log('customerId tipo:', typeof createData.customerId, 'valor:', createData.customerId);
      console.log('totalAmount tipo:', typeof createData.totalAmount, 'valor:', createData.totalAmount);
      console.log('creditDays tipo:', typeof createData.creditDays, 'valor:', createData.creditDays);

      // ✅ VERIFICAR QUE LOS NÚMEROS NO SEAN NaN
      if (isNaN(createData.customerId) || isNaN(createData.totalAmount) || isNaN(createData.creditDays)) {
        Sweetalert.fnc('error', 'Error en los datos numéricos. Verifica los campos.', null);
        this.loading = false;
        return;
      }

      console.log('Datos finales a enviar al backend:', createData);

      this.accountsReceivableService.create(createData)
        .pipe(finalize(() => this.loading = false))
        .subscribe({
          next: (response) => {
            Sweetalert.fnc('success', 'Cuenta por cobrar creada correctamente', null);
            this.dialogRef.close(response);
          },
          error: (error) => {
            console.error('Error creating account receivable:', error);
            console.error('Error details:', error.error);
            
            // ✅ MEJOR MANEJO DE ERRORES
            let errorMessage = 'Error desconocido';
            if (error.error && error.error.message) {
              if (Array.isArray(error.error.message)) {
                errorMessage = error.error.message.join(', ');
              } else {
                errorMessage = error.error.message;
              }
            } else if (error.message) {
              errorMessage = error.message;
            }
            
            Sweetalert.fnc('error', 'Error al crear: ' + errorMessage, null);
          }
        });
    }
  } else {
    this.markFormGroupTouched(this.cobroForm);
    
    // ✅ MOSTRAR ERRORES ESPECÍFICOS DE VALIDACIÓN
    const errors: string[] = [];
    Object.keys(this.cobroForm.controls).forEach(key => {
      const control = this.cobroForm.get(key);
      if (control?.errors && control?.touched) {
        errors.push(`${this.getFieldLabel(key)}: ${this.getFieldError(key)}`);
      }
    });
    
    console.log('Errores de validación:', errors);
    Sweetalert.fnc('error', 'Errores de validación:\n' + errors.join('\n'), null);
  }
}

  // NUEVO MÉTODO PARA GUARDAR DATOS REALES
  private saveRealDataToStorage(accountId: string, realData: any): void {
    try {
      // Obtener datos existentes del localStorage
      const existingData = JSON.parse(localStorage.getItem('cobros_real_data') || '{}');
      
      // Agregar los nuevos datos
      existingData[accountId] = realData;
      
      // Guardar de vuelta en localStorage
      localStorage.setItem('cobros_real_data', JSON.stringify(existingData));
      
      console.log('Datos reales guardados para ID:', accountId, realData);
    } catch (error) {
      console.error('Error saving real data to localStorage:', error);
    }
  }

  /**
   * Extrae el mensaje de error
   */
  private getErrorMessage(error: any): string {
    if (error.error instanceof ErrorEvent) {
      return `Error: ${error.error.message}`;
    } else {
      return `Error del servidor: ${error.status}, mensaje: ${error.message}`;
    }
  }

  private markFormGroupTouched(formGroup: FormGroup) {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  /**
   * Cierra el modal con confirmación si hay cambios sin guardar
   */
  async onClose() {
    // Verificar si el formulario tiene cambios sin guardar
    if (this.cobroForm.dirty) {
      const confirmed = await Sweetalert.confirmAction(
        'Cambios sin guardar',
        '¿Estás seguro de que quieres salir? Los cambios se perderán.'
      );
      
      if (confirmed) {
        this.dialogRef.close();
      }
    } else {
      this.dialogRef.close();
    }
  }

  // Métodos auxiliares para el template
  getFieldError(fieldName: string): string {
    const field = this.cobroForm.get(fieldName);
    if (field?.errors && field?.touched) {
      if (field.errors['required']) return `${this.getFieldLabel(fieldName)} es requerido`;
      if (field.errors['minlength']) return `Mínimo ${field.errors['minlength'].requiredLength} caracteres`;
      if (field.errors['maxlength']) return `Máximo ${field.errors['maxlength'].requiredLength} caracteres`;
      if (field.errors['min']) return `Valor mínimo: ${field.errors['min'].min}`;
    }
    return '';
  }

  hasFieldError(fieldName: string): boolean {
    const field = this.cobroForm.get(fieldName);
    return !!(field?.errors && field?.touched);
  }

  /**
   * Obtiene la etiqueta amigable del campo
   */
  private getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      'selectedCustomerId': 'Cliente',
      'customerName': 'Nombre del cliente',
      'customerRfc': 'RFC del cliente',
      'totalAmount': 'Monto total',
      'creditDays': 'Días de crédito',
      'dueDate': 'Fecha de vencimiento',
      'documentId': 'ID del documento',
      'documentType': 'Tipo de documento',
      'concept': 'Concepto',
      'notes': 'Notas'
    };
    return labels[fieldName] || fieldName;
  }
}
