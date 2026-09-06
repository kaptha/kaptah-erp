import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { switchMap } from 'rxjs/operators';

import { Sweetalert } from '../../functions';
import { UsersModel } from '../../models/users.model';
import { UsersService } from '../../services/users.service';
import { TermsDialogComponent } from '../terms-dialog/terms-dialog.component';
import { RegimenFiscalService, RegimenFiscal } from '../../services/regimen-fiscal.service';
import { RolesService } from '../../services/roles.service';

@Component({
    selector: 'app-register',
    templateUrl: './register.component.html',
    styleUrls: ['./register.component.css'],
    standalone: false
})
export class RegisterComponent implements OnInit {
  registroForm!: FormGroup;
  user: UsersModel;
  hidePassword: boolean = true;
  isLoading: boolean = false;
  
  // Tipo de persona y régimen fiscal
  tipoPersona: 'fisica' | 'moral' = 'fisica';
  regimenesFiscalesFiltrados: RegimenFiscal[] = [];
  rfcDuplicado: boolean = false;
  emailDuplicado: boolean = false;

  constructor(
    private fb: FormBuilder, 
    private snackBar: MatSnackBar, 
    private usersService: UsersService,
    private dialog: MatDialog,
    private router: Router,
    private regimenFiscalService: RegimenFiscalService,
      private rolesService: RolesService
  ) {
    this.user = new UsersModel();
  }

  ngOnInit(): void {
    this.initForm();
  }

  /**
   * Inicializa el formulario con validaciones
   */
  private initForm(): void {
    this.registroForm = this.fb.group({
      nombre: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      rfc: ['', [
        Validators.required, 
        Validators.pattern(/^[A-Z&Ñ]{3,4}[0-9]{2}(0[1-9]|1[012])(0[1-9]|[12][0-9]|3[01])[A-Z0-9]{2}[0-9A]$/)
      ]],
      phone: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
      tipoPersona: ['fisica', Validators.required],
      fiscalRegime: ['', Validators.required],
      password: ['', [
        Validators.required, 
        Validators.minLength(8),
        Validators.pattern(/^(?=.*[a-z])(?=.*[!@#$%^&*])/)
      ]],
      plan: ['', Validators.required],
      terms: [false, Validators.requiredTrue]
    });

    // Cargar regímenes fiscales iniciales (Persona Física por defecto)
    this.regimenesFiscalesFiltrados = this.regimenFiscalService.getRegimenesPorTipo('fisica');

    // Escuchar cambios en tipo de persona
    this.registroForm.get('tipoPersona')?.valueChanges.subscribe(tipo => {
      this.onTipoPersonaChange(tipo);
    });

    // Escuchar cambios en RFC para auto-detectar tipo de persona
    this.registroForm.get('rfc')?.valueChanges.subscribe(rfc => {
      if (rfc && rfc.length >= 12) {
        this.autoDetectTipoPersona(rfc);
      }
    });
  }

  /**
   * Auto-detecta el tipo de persona basado en el RFC
   */
  private autoDetectTipoPersona(rfc: string): void {
    // RFC de 12 caracteres = Persona Moral
    // RFC de 13 caracteres = Persona Física
    const tipoDetectado: 'fisica' | 'moral' = rfc.length === 12 ? 'moral' : 'fisica';
    
    // Solo actualizar si es diferente al actual
    if (tipoDetectado !== this.registroForm.get('tipoPersona')?.value) {
      this.registroForm.patchValue({ tipoPersona: tipoDetectado }, { emitEvent: true });
    }
  }

  /**
   * Maneja el cambio de tipo de persona
   */
  onTipoPersonaChange(tipo: 'fisica' | 'moral'): void {
    this.tipoPersona = tipo;
    this.regimenesFiscalesFiltrados = this.regimenFiscalService.getRegimenesPorTipo(tipo);
    
    // Limpiar el régimen fiscal seleccionado si no es válido para el nuevo tipo
    const fiscalRegActual = this.registroForm.get('fiscalRegime')?.value;
    if (fiscalRegActual) {
      const esValido = this.regimenesFiscalesFiltrados.some(r => r.clave === fiscalRegActual);
      if (!esValido) {
        this.registroForm.patchValue({ fiscalRegime: '' });
      }
    }
  }

  /**
   * Convierte el texto del RFC a mayúsculas
   */
  convertToUpper(event: Event): void {
    const input = event.target as HTMLInputElement;
    input.value = input.value.toUpperCase();
    this.registroForm.patchValue({ rfc: input.value });
  }
  
  /**
   * Abre el diálogo de términos y condiciones
   */
  openTermsDialog(): void {
    this.dialog.open(TermsDialogComponent, {
      width: '600px',
      maxHeight: '80vh',
      panelClass: 'terms-dialog-container', 
      autoFocus: false,
      disableClose: false
    });
  }
  
  /**
   * Envía el formulario
   */
  onSubmit() {
    if (this.registroForm.valid) {
      this.isLoading = true;
      Sweetalert.fnc("Cargando", "Procesando registro...", null);
      
      // Preparar datos del formulario
      const formData = this.prepareFormData();
      
      // Registrar en Firebase Auth
      this.registerInFirebaseAuth(formData);
    } else {
      console.log('Formulario inválido');
      this.markFormGroupTouched(this.registroForm);
      Sweetalert.fnc('error', 'Por favor, complete todos los campos requeridos', 'Cerrar');
    }
  }

  /**
   * Prepara los datos del formulario para enviar
   */
  private prepareFormData(): any {
    return {
      ...this.registroForm.value,
      rfc: this.registroForm.get('rfc')?.value?.toUpperCase() ?? '',
      returnSecureToken: true
    };
  }

  /**
   * Registra al usuario en Firebase Auth
   */
  private registerInFirebaseAuth(formData: any): void {
    this.usersService.registerAuth(formData).subscribe(
      (resp: any) => {
        // Guardar en BD inmediatamente; el email de verificación es un paso posterior no bloqueante
        this.registerUserInDatabases(resp, formData);
      },
      error => {
        this.isLoading = false;
        console.error('Error de autenticación:', error);
        Sweetalert.fnc('error', error.error?.error?.message || 'Error al registrar usuario', null);
      }
    );
  }

  /**
   * Envía email de verificación
   */
  private sendEmailVerification(formData: any): void {
    this.usersService.sendBrandedEmailVerification(formData.email, formData.nombre).subscribe(
      (resp: any) => {
        if (resp.success) {
          console.log('✅ Email de verificación enviado');
        } else {
          console.error('⚠️ No se pudo enviar verificación (no crítico, el usuario ya está registrado)');
        }
      },
      error => {
        console.error('⚠️ Error al enviar verificación (no crítico, el usuario ya está registrado):', error);
      }
    );
  }

  /**
   * Registra al usuario en las bases de datos (Firebase Realtime y MySQL)
   * CORREGIDO: Ya no usa registerUser() que causaba duplicación
   */
  private registerUserInDatabases(authResp: any, formData: any): void {
    // Datos MÍNIMOS para Firebase Realtime Database
    const firebaseUserData: any = {
      nombre: String(formData.nombre), 
      email: authResp.email,
      rfc: formData.rfc,
      telefono: formData.phone,
      plan: formData.plan,
      firebaseUid: authResp.localId,
      suscripcionActiva: false,
      cicloFacturacion: 'anual',
      Confirm: false
    };

    // Datos completos para MySQL (CON tipo_persona y fiscalReg)
    const mysqlUserData: UsersModel = {
      nombre: String(formData.nombre), 
      email: authResp.email,
      firebaseUid: authResp.localId,
      realtimeDbKey: '', 
      rfc: formData.rfc,
      tipo_persona: formData.tipoPersona,
      telefono: formData.phone,
      fiscalReg: formData.fiscalRegime,
      returnSecureToken: formData.returnSecureToken,
      Confirm: false,
    };

    console.log('=================================');
    console.log('🔥 FIREBASE - Objeto a enviar:');
    console.log(JSON.stringify(firebaseUserData, null, 2));
    console.log('🔥 FIREBASE - Campos:', Object.keys(firebaseUserData));
    console.log('🔥 FIREBASE - URL:', `${this.usersService['api']}/usuarios.json`);
    console.log('=================================');

    // Paso 1: Registrar en Firebase Realtime Database
    this.usersService.registerDatabase(firebaseUserData, authResp.idToken).pipe(
      switchMap((firebaseResp: any) => {
        console.log('✅ Firebase Success! Response:', firebaseResp);
        
        // Actualizar el realtimeDbKey con la respuesta de Firebase
        mysqlUserData.realtimeDbKey = firebaseResp.name;
        mysqlUserData.firebaseUid = authResp.localId;
        
        console.log('🗄️ MYSQL - Objeto a enviar:', mysqlUserData);
        
        // Paso 2: Registrar en MySQL con datos completos
        return this.usersService.registerDatabaseMySQL(mysqlUserData);
      })
    ).subscribe(
      (mysqlResp: any) => {
        this.isLoading = false;
        console.log('✅ MySQL Success! Response:', mysqlResp);

          // Seed de roles para la nueva cuenta
          this.rolesService.seedRoles(mysqlUserData.firebaseUid || '').subscribe(
            (rolesResp: any) => console.log('✅ Roles creados:', rolesResp),
            (rolesErr: any) => console.error('⚠️ Error al crear roles:', rolesErr)
          );

          // Envío de verificación: best-effort, no bloquea el registro ya completado
          this.sendEmailVerification(formData);
        
        Sweetalert.fnc('success', 'Cuenta creada exitosamente. Por favor confirma tu correo para acceder (revisa spam)', 'Cerrar');
        
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 3000);
      },
      error => {
        this.isLoading = false;
        console.error('=================================');
        console.error('❌ ERROR DETAILS:');
        console.error('Status:', error.status);
        console.error('URL que falló:', error.url);
        console.error('Error completo:', error);
        
        if (error.error) {
          console.error('Error body:', error.error);
          if (typeof error.error === 'string') {
            console.error('Error string:', error.error);
          }
        }
        console.error('=================================');
        
        let errorMessage = 'Error al registrar en la base de datos';
        
        if (error.error?.error) {
          errorMessage = `Error: ${error.error.error}`;
        } else if (error.error?.message) {
          errorMessage = error.error.message;
        }
        
        Sweetalert.fnc('error', errorMessage, 'Cerrar');
      }
    );
  }
/**
   * Valida si el RFC ya existe en la base de datos
   */
  verificarRfcDuplicado(): void {
    const rfc = this.registroForm.get('rfc')?.value?.toUpperCase();
    if (rfc && rfc.length >= 12 && this.registroForm.get('rfc')?.valid) {
      this.usersService.checkRfcExists(rfc).subscribe(
        (resp) => {
          this.rfcDuplicado = resp.exists;
          if (resp.exists) {
            this.registroForm.get('rfc')?.setErrors({ duplicado: true });
          }
        },
        (error) => console.error('Error al verificar RFC:', error)
      );
    }
  }

  /**
   * Valida si el email ya existe en la base de datos
   */
  verificarEmailDuplicado(): void {
    const email = this.registroForm.get('email')?.value;
    if (email && this.registroForm.get('email')?.valid) {
      this.usersService.checkEmailExists(email).subscribe(
        (resp) => {
          this.emailDuplicado = resp.exists;
          if (resp.exists) {
            this.registroForm.get('email')?.setErrors({ duplicado: true });
          }
        },
        (error) => console.error('Error al verificar email:', error)
      );
    }
  }

  /**
   * Muestra un snackbar con mensaje
   */
  showSnackBar(message: string, action: string) {
    this.snackBar.open(message, action, {
      duration: 3000,
      panelClass: ['red-snackbar']
    });
  }

  /**
   * Marca todos los campos del formulario como tocados
   */
  markFormGroupTouched(formGroup: FormGroup) {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();

      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }
}



