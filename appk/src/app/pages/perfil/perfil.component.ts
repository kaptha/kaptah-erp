import { Component, OnInit, ViewEncapsulation, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { UsersService } from 'src/app/services/users.service';
import { ApibizService } from '../../services/apibiz.service';
import { SucursalModalComponent } from './sucursal-modal/sucursal-modal.component';
import { ImpuestoModalComponent } from './impuesto-modal/impuesto-modal.component';
import { CsdUploadModalComponent } from './csd-upload-modal/csd-upload-modal.component';
import { FielUploadModalComponent } from './fiel-upload-modal/fiel-upload-modal.component';
import { ImpuestosService } from '../../services/impuestos.service';
import { SucursalesService } from '../../services/sucursales.service';
import { LogoService } from '../../services/logo.service';
import { FielService } from '../../services/fiel.service';
import { CsdService } from '../../services/csd.service';
import { RegimenFiscalService, RegimenFiscal } from '../../services/regimen-fiscal.service';
import { Sucursal } from '../../models/sucursal.model';
import { HttpEventType } from '@angular/common/http';
import Swal from 'sweetalert2';

interface Impuesto {
  id?: number;
  alias: string;
  uso: string;
  tipo_impuesto: string;
  impuesto: string;
  tasa: number;
  valor_cuota: string;
  userId?: number;
}

interface LogoResponse {
  url: string;
  filename?: string;
  type?: string;
  size?: number;
  message?: string;
}

@Component({
    selector: 'app-perfil',
    templateUrl: './perfil.component.html',
    styleUrls: ['./perfil.component.css'],
    encapsulation: ViewEncapsulation.None,
    standalone: false
})
export class PerfilComponent implements OnInit {
  // Perfil
  perfilForm!: FormGroup;
  email: string = '';
  isLoading: boolean = false;
  
  // Tipo de persona y régimen fiscal
  tipoPersona: 'fisica' | 'moral' = 'fisica';
  regimenesFiscalesFiltrados: RegimenFiscal[] = [];
  
  // FIEL y CSD fecha
  fielExpiryDate: string = '';
  csdExpiryDate: string = '';
  
  // Sucursales
  displayedColumnsSucursales: string[] = ['alias', 'telefono', 'direccion', 'codigoPostal', 'colonia', 'acciones'];
  sucursales: Sucursal[] = [];
  
  // Impuestos
  displayedColumnsImpuestos: string[] = ['alias', 'uso', 'tipo_impuesto', 'impuesto', 'tasa', 'valor_cuota', 'acciones'];
  impuestos: Impuesto[] = [];

  // Logo
  logoFile: File | null = null;
  logoFileName: string = '';
  logoUrl: string | null = null;
  uploading: boolean = false;
  
  // Propiedad para los términos
  terminosCondiciones: string = '';
  terminosOriginal: string = '';
  constructor(
    public dialog: MatDialog,
    private fb: FormBuilder,
    private usersService: UsersService,
    private impuestosService: ImpuestosService,
    private sucursalesService: SucursalesService,
    private fielService: FielService,
    private csdService: CsdService,
    private logoService: LogoService,
    private apibizService: ApibizService,
    private regimenFiscalService: RegimenFiscalService,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef,
    private router: Router,
  ) {}
  
  ngOnInit(): void {
    this.initForm();
    this.loadUserData();
    this.cargarImpuestos();
    this.cargarSucursales();
    this.loadFielData();
    this.loadCsdData();
    this.loadLogoData();
    this.cargarTerminosCondiciones();
  }
  /**
   * Navega al componente de selección de plantillas de facturas
   */
  navigateToInvoiceDesign(): void {
    this.router.navigate(['/dashboard/invoice-design-selector']);
  }
  /**
   * Inicializa el formulario con validaciones
   */
  initForm() {
    this.perfilForm = this.fb.group({
      nombre: ['', Validators.required],
      nombreComercial: [''],
      phone: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
      rfc: ['', [Validators.required, Validators.pattern(/^[A-Z&Ñ]{3,4}\d{6}[A-Z\d]{3}$/)]],
      codigoPostal: [''],
      colonia: [''],
      tipoPersona: ['fisica', Validators.required],
      fiscalReg: ['', Validators.required]
    });

    // Cargar regímenes fiscales iniciales (Persona Física por defecto)
    this.regimenesFiscalesFiltrados = this.regimenFiscalService.getRegimenesPorTipo('fisica');

    // Escuchar cambios en tipo de persona
    this.perfilForm.get('tipoPersona')?.valueChanges.subscribe(tipo => {
      this.onTipoPersonaChange(tipo);
    });
  }

  /**
   * Carga datos del usuario
   */
  loadUserData() {
    this.isLoading = true;
    const idToken = localStorage.getItem('idToken');
    
    if (idToken) {
      this.usersService.getUserByToken(idToken).subscribe(
        user => {
          console.log('Datos del usuario recibidos:', user);
          if (user) {
            // Determinar tipo de persona basado en el régimen fiscal o RFC
            const tipoPersonaDeterminado = user.tipo_persona || this.determinarTipoPersona(user.rfc, user.fiscalReg);
            
            // Actualizar propiedad de la clase
            this.tipoPersona = tipoPersonaDeterminado;
            
            this.perfilForm.patchValue({
              nombre: user.nombre || '',
              nombreComercial: user.nombreComercial || '',
              phone: user.phone || '',
              rfc: user.rfc || '',
              codigoPostal: user.codigoPostal || '',
              colonia: user.colonia || '',
              tipoPersona: tipoPersonaDeterminado,
              fiscalReg: user.fiscalReg || ''
            });
            this.email = user.email || '';
            
            // Actualizar regímenes fiscales filtrados
            this.regimenesFiscalesFiltrados = this.regimenFiscalService.getRegimenesPorTipo(tipoPersonaDeterminado);
          }
          this.isLoading = false;
        },
        error => {
          console.error('Error al cargar datos del usuario:', error);
          this.showSnackBar('Error al cargar datos del usuario', 'Cerrar');
          this.isLoading = false;
        }
      );
    } else {
      console.log('No se encontró idToken en localStorage');
      this.isLoading = false;
    }
  }

  /**
   * Determina el tipo de persona basado en el RFC o régimen fiscal
   */
  private determinarTipoPersona(rfc: string, fiscalReg: string): 'fisica' | 'moral' {
    // Si tiene régimen fiscal, verificar si es de persona física o moral
    if (fiscalReg) {
      const regimen = this.regimenFiscalService.getRegimenByClave(fiscalReg);
      if (regimen) {
        return regimen.moral && !regimen.fisica ? 'moral' : 'fisica';
      }
    }
    
    // Si el RFC tiene 12 caracteres, es persona moral, si tiene 13 es persona física
    if (rfc) {
      return rfc.length === 12 ? 'moral' : 'fisica';
    }
    
    return 'fisica'; // Por defecto
  }

  /**
   * Maneja el cambio de tipo de persona
   */
  onTipoPersonaChange(tipo: 'fisica' | 'moral') {
    this.tipoPersona = tipo;
    this.regimenesFiscalesFiltrados = this.regimenFiscalService.getRegimenesPorTipo(tipo);
    
    // Limpiar el régimen fiscal seleccionado si no es válido para el nuevo tipo
    const fiscalRegActual = this.perfilForm.get('fiscalReg')?.value;
    if (fiscalRegActual) {
      const esValido = this.regimenesFiscalesFiltrados.some(r => r.clave === fiscalRegActual);
      if (!esValido) {
        this.perfilForm.patchValue({ fiscalReg: '' });
      }
    }
  }
  
  /**
   * Abre modal para agregar sucursal
   */
  openSucursalModal(): void {
    const dialogRef = this.dialog.open(SucursalModalComponent, {
      width: '600px',
      maxWidth: '95vw',
      panelClass: 'custom-dialog-container'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.cargarSucursales();
      }
    });
  }
  
  /**
   * Abre modal para agregar impuesto
   */
  openImpuestoModal(): void {
    const dialogRef = this.dialog.open(ImpuestoModalComponent, {
      width: '800px', 
      maxWidth: '95vw', 
      panelClass: 'custom-dialog-container'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.cargarImpuestos();
      }
    });
  }
  
  /**
   * Abre modal para cargar certificado CSD
   */
  openCsdUploadModal(): void {
    const userRfc = this.perfilForm.get('rfc')?.value;
    
    if (!userRfc) {
      this.showSnackBar('Primero debes guardar tu RFC en tu perfil', 'Cerrar');
      return;
    }
    
    const dialogRef = this.dialog.open(CsdUploadModalComponent, {
      width: '500px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      height: 'auto',
      panelClass: ['custom-dialog-container', 'csd-dialog'],
      autoFocus: false,
      disableClose: false,
      data: { userRfc: userRfc }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadCsdData();
      }
    });
  }
  
  /**
   * Abre modal para cargar certificado FIEL
   */
  openFielUploadModal(): void {
    const userRfc = this.perfilForm.get('rfc')?.value;
    
    if (!userRfc) {
      this.showSnackBar('Primero debes guardar tu RFC en tu perfil', 'Cerrar');
      return;
    }
    
    const dialogRef = this.dialog.open(FielUploadModalComponent, {
      width: '500px',
      height: 'auto',
      maxHeight: '90vh',
      disableClose: false,
      data: { userRfc: userRfc }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadFielData();
      }
    });
  }
  
  /**
   * Carga los impuestos del usuario
   */
  cargarImpuestos() {
    this.isLoading = true;
    this.impuestosService.getImpuestos()
      .subscribe({
        next: (data) => {
          this.impuestos = data;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error al cargar impuestos:', error);
          this.showSnackBar('Error al cargar impuestos', 'Cerrar');
          this.isLoading = false;
        }
      });
  }
  
  /**
   * Elimina un impuesto
   */
  eliminarImpuesto(id: number) {
    if (confirm('¿Está seguro de que desea eliminar este impuesto?')) {
      this.isLoading = true;
      this.impuestosService.deleteImpuesto(id).subscribe({
        next: () => {
          this.showSnackBar('Impuesto eliminado exitosamente', 'Cerrar');
          this.cargarImpuestos();
        },
        error: (error) => {
          this.showSnackBar('Error al eliminar el impuesto', 'Cerrar');
          console.error('Error:', error);
          this.isLoading = false;
        }
      });
    }
  }
  
  /**
   * Carga las sucursales del usuario
   */
  cargarSucursales() {
    this.isLoading = true;
    this.sucursalesService.getSucursales()
      .subscribe({
        next: (data) => {
          this.sucursales = data;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error al cargar sucursales:', error);
          this.showSnackBar('Error al cargar sucursales', 'Cerrar');
          this.isLoading = false;
        }
      });
  }

  /**
   * Elimina una sucursal
   */
  eliminarSucursal(id: number) {
    if (confirm('¿Está seguro de que desea eliminar esta sucursal?')) {
      this.isLoading = true;
      this.sucursalesService.deleteSucursal(id).subscribe({
        next: () => {
          this.showSnackBar('Sucursal eliminada exitosamente', 'Cerrar');
          this.cargarSucursales();
        },
        error: (error) => {
          this.showSnackBar('Error al eliminar la sucursal', 'Cerrar');
          console.error('Error:', error);
          this.isLoading = false;
        }
      });
    }
  }

  /**
   * Carga datos de certificado FIEL
   */
  loadFielData() {
    this.fielService.getActiveFiel().subscribe({
      next: (data) => {
        if (data?.validUntil) {
          this.fielExpiryDate = new Date(data.validUntil).toLocaleDateString();
        }
      },
      error: (error) => {
        console.error('Error al cargar datos de FIEL:', error);
      }
    });
  }
  
  /**
   * Carga datos de certificado CSD
   */
  loadCsdData() {
    this.csdService.getActiveCsd().subscribe({
      next: (data) => {
        if (data?.validUntil) {
          this.csdExpiryDate = new Date(data.validUntil).toLocaleDateString();
        }
      },
      error: (error) => {
        console.error('Error al cargar datos de CSD:', error);
      }
    });
  }

  /**
   * Envía el formulario de perfil - ACTUALIZADO
   * Ahora guarda en Firebase y MySQL
   */
  onSubmit() {
    if (this.perfilForm.valid) {
      this.isLoading = true;
      
      const tipoPersonaValue = this.perfilForm.get('tipoPersona')?.value;
      console.log('🔍 Valor de tipoPersona:', tipoPersonaValue, 'Tipo:', typeof tipoPersonaValue);
      
      const userData = {
        nombre: this.perfilForm.get('nombre')?.value,
        nombreComercial: this.perfilForm.get('nombreComercial')?.value || '',
        phone: this.perfilForm.get('phone')?.value,
        rfc: this.perfilForm.get('rfc')?.value.toUpperCase(),
        fiscalReg: this.perfilForm.get('fiscalReg')?.value,
        tipoPersona: tipoPersonaValue,
        email: this.email
      };
      
      console.log('📤 Enviando datos para actualizar:', userData);
      
      this.usersService.updateUserData(userData).subscribe({
        next: (response) => {
          console.log('✅ Actualización exitosa:', response);
          this.showSnackBar('Datos actualizados exitosamente', 'Cerrar');
          this.isLoading = false;
          
          // Recargar los datos para mostrar los cambios
          this.loadUserData();
        },
        error: (error) => {
          console.error('❌ Error al actualizar datos:', error);
          
          let errorMessage = 'Error al actualizar datos';
          if (error.error?.message) {
            errorMessage = error.error.message;
          } else if (error.message) {
            errorMessage = error.message;
          }
          
          this.showSnackBar(errorMessage, 'Cerrar');
          this.isLoading = false;
        }
      });
    } else {
      this.markFormGroupTouched(this.perfilForm);
      this.showSnackBar('Por favor, complete correctamente todos los campos requeridos', 'Cerrar');
    }
  }
  
  /**
   * Marca todos los campos del formulario como tocados
   */
  markFormGroupTouched(formGroup: FormGroup) {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }
  
  /**
   * Muestra mensaje de notificación
   */
  showSnackBar(message: string, action: string) {
    this.snackBar.open(message, action, {
      duration: 3000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom'
    });
  }

  /**
   * Carga los datos del logo actual
   */
  loadLogoData() {
    console.log('=== Iniciando carga de logo ===');
    this.logoService.getLogo().subscribe({
      next: (data: LogoResponse) => {
        console.log('✅ Respuesta del servidor:', data);
        
        if (data && data.url) {
          this.logoUrl = data.url;
          this.logoFileName = data.filename || 'Logo actual';
          console.log('✅ Logo URL asignada:', this.logoUrl);
          
          // Forzar detección de cambios
          this.cdr.detectChanges();
          
          // Verificar que el DOM se actualizó
          setTimeout(() => {
            const imgElement = document.querySelector('.preview-logo') as HTMLImageElement;
            if (imgElement) {
              console.log('✅ Elemento IMG encontrado, src:', imgElement.src);
            } else {
              console.error('❌ Elemento IMG no encontrado en el DOM');
            }
          }, 100);
        } else {
          console.warn('⚠️ Respuesta sin URL:', data);
        }
      },
      error: (error: any) => {
        if (error.status === 404) {
          console.log('ℹ️ Usuario no tiene logo (404 - normal)');
        } else {
          console.error('❌ Error al cargar logo:', error);
          this.showSnackBar('Error al cargar el logo', 'Cerrar');
        }
      }
    });
  }

  /**
   * Guarda el logo en el servidor
   */
  saveLogo() {
    if (!this.logoFile) {
      this.showSnackBar('Seleccione un archivo primero', 'Cerrar');
      return;
    }
    
    this.uploading = true;
    console.log('Iniciando carga de logo...');
    
    this.logoService.uploadLogo(this.logoFile).subscribe({
      next: (event: any) => {
        console.log('Evento recibido:', event);
        
        // HttpEventType.UploadProgress = 1
        if (event.type === 1) {
          console.log(`Progreso: ${event.loaded}/${event.total}`);
        }
        
        // HttpEventType.Response = 4
        if (event.type === HttpEventType.Response) {
          this.uploading = false;
          console.log('=== GUARDADO EXITOSO ===');
          console.log('Respuesta completa del servidor:', event.body);
          
          // Actualizar logo con el recién subido
          if (event.body && event.body.url) {
            console.log('URL recibida del backend:', event.body.url);
            this.logoUrl = event.body.url;
            this.logoFileName = event.body.filename || this.logoFile?.name || '';
            
            // Forzar actualización visual
            this.cdr.detectChanges();
            
            // Verificar después de un momento
            setTimeout(() => {
              console.log('logoUrl después de guardar:', this.logoUrl);
              const imgElement = document.querySelector('.preview-logo') as HTMLImageElement;
              if (imgElement) {
                console.log('IMG src después de guardar:', imgElement.src);
              }
            }, 100);
            
            this.showSnackBar('Logo guardado exitosamente', 'Cerrar');
          } else {
            console.error('No se recibió URL en la respuesta');
          }
          
          // Limpiar archivo temporal seleccionado
          this.logoFile = null;
          const fileInput = document.getElementById('logo-upload') as HTMLInputElement;
          if (fileInput) {
            fileInput.value = '';
          }
        }
      },
      error: (error: any) => {
        this.uploading = false;
        console.error('Error detallado al subir el logo:', error);
        
        let errorMessage = 'Error al guardar el logo';
        if (error.error?.message) {
          errorMessage = error.error.message;
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        this.showSnackBar(errorMessage, 'Cerrar');
      }
    });
  }

  /**
   * Maneja la selección de archivo de logo
   */
  onLogoSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      
      console.log('Archivo seleccionado:', {
        name: file.name,
        type: file.type,
        size: file.size
      });
      
      // Validar tipo de archivo
      const validTypes = ['image/png', 'image/jpeg', 'image/svg+xml'];
      if (!validTypes.includes(file.type)) {
        this.showSnackBar('Formato de archivo no válido. Use PNG, JPG o SVG', 'Cerrar');
        this.resetLogoInput();
        return;
      }
      
      // Validar tamaño (máximo 2MB)
      const maxSize = 2 * 1024 * 1024; // 2MB
      if (file.size > maxSize) {
        this.showSnackBar('El archivo es demasiado grande. Máximo 2MB', 'Cerrar');
        this.resetLogoInput();
        return;
      }
      
      this.logoFile = file;
      this.logoFileName = file.name;
      
      // Mostrar vista previa del archivo seleccionado
      const reader = new FileReader();
      reader.onload = (e) => {
        this.logoUrl = e.target?.result as string;
        this.cdr.detectChanges();
        console.log('Vista previa generada para archivo seleccionado');
      };
      reader.readAsDataURL(file);
    }
  }

  /**
   * Reinicia el campo de selección de archivo
   */
  resetLogoInput() {
    this.logoFile = null;
    this.logoFileName = '';
    
    // Resetear el input file
    const fileInput = document.getElementById('logo-upload') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
    
    // Recargar el logo guardado (si existe)
    this.loadLogoData();
  }

  /**
   * Formatea el tamaño del archivo para mostrarlo
   */
  formatFileSize(bytes: number): string {
    if (bytes < 1024) {
      return bytes + ' bytes';
    } else if (bytes < 1024 * 1024) {
      return (bytes / 1024).toFixed(1) + ' KB';
    } else {
      return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }
  }

  /**
   * Maneja errores al cargar la imagen
   */
  onImageError(event: any) {
    console.error('Error al cargar imagen:', event);
    console.log('URL que falló:', this.logoUrl);
    // Opcional: mostrar imagen por defecto
    this.logoUrl = '/assets/img/no-logo.png';
  }
  // Método para cargar términos
cargarTerminosCondiciones() {
  this.apibizService.getTerminosCondiciones().subscribe({
    next: (response) => {
      this.terminosCondiciones = response.terminos || '';
      this.terminosOriginal = this.terminosCondiciones;
    },
    error: (error) => {
      console.error('Error al cargar términos:', error);
    }
  });
}

// Método para guardar términos
guardarTerminosCondiciones() {
  if (this.terminosCondiciones.trim() === '') {
    // Mostrar error si está vacío
    Swal.fire({
      icon: 'warning',
      title: 'Campos vacíos',
      text: 'Por favor ingrese los términos y condiciones',
      confirmButtonColor: '#8e24aa'
    });
    return;
  }

  this.apibizService.updateTerminosCondiciones(this.terminosCondiciones).subscribe({
    next: (response) => {
      this.terminosOriginal = this.terminosCondiciones;
      Swal.fire({
        icon: 'success',
        title: 'Guardado',
        text: 'Términos y condiciones actualizados correctamente',
        confirmButtonColor: '#8e24aa'
      });
    },
    error: (error) => {
      console.error('Error al guardar términos:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudieron guardar los términos y condiciones',
        confirmButtonColor: '#8e24aa'
      });
    }
  });
}

// Método para verificar si hay cambios
get terminosModificados(): boolean {
  return this.terminosCondiciones !== this.terminosOriginal;
}
}