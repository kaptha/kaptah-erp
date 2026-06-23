import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { PasswordResetDialogComponent } from '../password-reset-dialog/password-reset-dialog.component';
import { HttpClient } from '@angular/common/http';
import { GetUserData } from '../../config';
import { Sweetalert } from '../../functions';
import { switchMap } from 'rxjs/operators';

import { UsersModel } from '../../models/users.model';

import { UsersService  } from '../../services/users.service';

import { AuthService } from '../../services/auth.service';
import { RolesService } from '../../services/roles.service';

@Component({
    selector: 'app-login',
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.css'],
    standalone: false
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  user: UsersModel;
  rememberMe: boolean = false;
  hidePassword: boolean = true;
  isLoading: boolean = false;
  mostrarReenviarVerificacion: boolean = false;
  enviandoVerificacion: boolean = false;
  
  constructor(
    private fb: FormBuilder,
    private usersService: UsersService,
    private activatedRoute: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private dialog: MatDialog,
    private http: HttpClient,
      private rolesService: RolesService
    ) {
    this.user = new UsersModel();
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [
        Validators.required,
        Validators.minLength(8),
        Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
      ]],
      rememberMe: [false]
    });
  }

  get email() { return this.loginForm.get('email'); }
  get password() { return this.loginForm.get('password'); }

  ngOnInit(): void {    
    /*=============================================
    Validar acción de recordar credencial de correo
    =============================================*/
    if (localStorage.getItem("rememberMe") && localStorage.getItem("rememberMe") === "yes") {
      this.loginForm.patchValue({
        email: localStorage.getItem("email") || '',
        rememberMe: true
      });
      this.rememberMe = true;
    }
   // Redirigir a reset-password si viene con mode=resetPassword
    if (this.activatedRoute.snapshot.queryParams["mode"] === "resetPassword" &&
        this.activatedRoute.snapshot.queryParams["oobCode"]) {
      const oobCode = this.activatedRoute.snapshot.queryParams["oobCode"];
      this.router.navigate(['/reset-password'], { 
        queryParams: { mode: 'resetPassword', oobCode: oobCode } 
      });
      return;
    }
    
    /*=============================================
    Verificar cuenta de correo electrónico
    =============================================*/
    this.verifyEmail();
  }

  /**
   * Verifica el email cuando se accede desde el enlace de verificación
   */
  private verifyEmail(): void {
    if (this.activatedRoute.snapshot.queryParams["oobCode"] !== undefined &&
        this.activatedRoute.snapshot.queryParams["mode"] === "verifyEmail") {

      let body = {
        oobCode: this.activatedRoute.snapshot.queryParams["oobCode"]
      };

      this.usersService.confirmEmailVerificationFnc(body)
        .subscribe((resp: any) => {
          if (resp["emailVerified"]) {
            this.updateEmailConfirmation(resp["email"]);
          }
        }, err => {
          if (err.error.error.message === "INVALID_OOB_CODE") {
            Sweetalert.fnc("error", "El correo ya ha sido confirmado", "login");
          }
        });
    }
  }

  /**
   * Actualiza el estado de confirmación del email en la base de datos
   */
  private updateEmailConfirmation(email: string): void {
    this.usersService.getFilterData("email", email)
      .subscribe((resp: any) => {
        for (const i in resp) {
          let id = Object.keys(resp).toString();
          let value = { Confirm: true };

          this.usersService.patchData(id, value)
            .subscribe((resp: any) => {
              if (resp["Confirm"]) {
                Sweetalert.fnc("success", "¡Correo confirmado, Ingresa Ahora!", "login");
              }
            });
        }
      });
  }

  /*=============================================
    Resetear contraseña
  =============================================*/
  openPasswordResetDialog(): void {
    this.dialog.open(PasswordResetDialogComponent, {
      width: '400px',
      panelClass: 'custom-dialog-container'
    });
  }

  /*=============================================
  Envío del formulario
  =============================================*/
  onSubmit() {
    if (this.loginForm.valid) {
      this.isLoading = true;
      Sweetalert.fnc("Cargando", "Cargando...", null);
      
      this.user.email = this.loginForm.get('email')?.value;
      this.user.password = this.loginForm.get('password')?.value;
      this.rememberMe = this.loginForm.get('rememberMe')?.value;
      
      /*=============================================
      Validar que el correo esté verificado
      =============================================*/
      this.validateEmailAndLogin();
    }
  }

  /**
 * Valida que el email esté verificado y realiza el login
 */
private validateEmailAndLogin(): void {
  this.user.returnSecureToken = true;
  
  // PRIMERO autenticamos con Firebase Auth
  this.usersService.loginAuth(this.user).subscribe(
    (authResp: any) => {
      console.log("✅ Autenticación exitosa:", authResp);
      
      // Guardamos temporalmente el token para poder hacer la consulta
      const tempToken = authResp["idToken"];
      
      // AHORA consultamos con el token recién obtenido
      this.checkUserConfirmation(tempToken, authResp);
    },
    (authError) => {
      this.handleAuthError(authError);
    }
  );
}

/**
 * Verifica si el usuario está confirmado
 */
private checkUserConfirmation(token: string, authResp: any): void {
    console.log("🔍 Verificando confirmación del usuario...");

    this.usersService.getFilterData("email", this.user.email, token).subscribe(
      (userData: any) => {
        console.log("✅ Datos de usuario obtenidos:", userData);

        if (!userData || Object.keys(userData).length === 0) {
          console.warn("⚠️ Usuario existe en Auth pero no en RTDB. Verificando si se puede reparar...");
          this.repararUsuarioHuerfano(token, authResp);
          return;
        }

        for (const key in userData) {
          if (userData[key].Confirm) {
            console.log("✅ Usuario confirmado, actualizando token...");
            this.updateUserToken(key, { idToken: token }, authResp);
          } else {
            // Confirm es false en Realtime DB, verificar con Firebase Auth
            console.log("⚠️ Confirm es false, verificando con Firebase Auth...");
            this.http.post(GetUserData.url, { idToken: token }).subscribe(
              (lookupResp: any) => {
                const emailVerified = lookupResp?.users?.[0]?.emailVerified;
                console.log("🔍 Firebase Auth emailVerified:", emailVerified);

                if (emailVerified) {
                  // Email ya verificado en Auth, actualizar Confirm en Realtime DB
                  this.usersService.patchData(key, { Confirm: true }, token).subscribe(
                    () => {
                      console.log("✅ Confirm actualizado a true");
                      this.updateUserToken(key, { idToken: token }, authResp);
                    },
                    (patchError) => {
                      console.error("❌ Error al actualizar Confirm:", patchError);
                      this.isLoading = false;
                      Sweetalert.fnc("error", "Error al confirmar usuario", null);
                    }
                  );
                } else {
                  this.isLoading = false;
                  Sweetalert.fnc("error", "Necesita Confirmar su Correo", null);
                }
              },
              (lookupError) => {
                console.error("❌ Error en lookup:", lookupError);
                this.isLoading = false;
                this.mostrarReenviarVerificacion = true;
                Sweetalert.fnc("error", "Necesita Confirmar su Correo", null);
              }
            );
          }
        }
      },
      (error) => {
        this.isLoading = false;
        Sweetalert.fnc("error", "Error al obtener datos del usuario", null);
        console.error("❌ Error getFilterData:", error);
      }
    );
  }

/**
 * Repara un usuario que existe en Firebase Auth pero no tiene registro en RTDB/MySQL.
 * Solo repara si el email está verificado en Auth; si no, pide confirmar correo.
 */
private repararUsuarioHuerfano(token: string, authResp: any): void {
  this.http.post(GetUserData.url, { idToken: token }).subscribe(
    (lookupResp: any) => {
      const emailVerified = lookupResp?.users?.[0]?.emailVerified;
      console.log("🔍 Firebase Auth emailVerified (reparación):", emailVerified);

      if (!emailVerified) {
        this.isLoading = false;
        this.mostrarReenviarVerificacion = true;
        Sweetalert.fnc("error", "Necesita Confirmar su Correo", null);
        return;
      }

      console.log("✅ Email verificado, reparando registro en RTDB + MySQL...");

      const nombreTemporal = (authResp.email || '').split('@')[0] || 'Usuario';

      const firebaseUserData: any = {
        nombre: nombreTemporal,
        email: authResp.email,
        rfc: 'XAXX010101000',
        telefono: '',
        plan: 'starter',
        suscripcionActiva: false,
        cicloFacturacion: 'anual',
        Confirm: true
      };

      this.usersService.registerDatabase(firebaseUserData, token).pipe(
        switchMap((firebaseResp: any) => {
          const mysqlUserData: UsersModel = {
            nombre: nombreTemporal,
            email: authResp.email,
            firebaseUid: authResp.localId,
            realtimeDbKey: firebaseResp.name,
            rfc: 'XAXX010101000',
            tipo_persona: 'fisica',
            telefono: '',
            fiscalReg: '',
            returnSecureToken: true,
            Confirm: true,
          };
          return this.usersService.registerDatabaseMySQL(mysqlUserData);
        })
      ).subscribe(
        () => {
          console.log("✅ Usuario reparado exitosamente, reintentando confirmación...");
          this.checkUserConfirmation(token, authResp);
        },
        (repairError) => {
          console.error("❌ Error al reparar usuario huérfano:", repairError);
          this.isLoading = false;
          Sweetalert.fnc("error", "Error al recuperar tu cuenta. Contacta a soporte.", null);
        }
      );
    },
    (lookupError) => {
      console.error("❌ Error en lookup de reparación:", lookupError);
      this.isLoading = false;
      Sweetalert.fnc("error", "Error al verificar tu cuenta", null);
    }
  );
}

/**
 * Manejo de errores de autenticación
 */
private handleAuthError(authError: any): void {
  this.isLoading = false;
  Sweetalert.fnc("close", "", null);
  
  if (authError.error?.error?.message === "INVALID_PASSWORD" || 
      authError.error?.error?.message === "INVALID_LOGIN_CREDENTIALS") {
    Sweetalert.fnc("error", "Contraseña incorrecta. Por favor, verifica tus credenciales.", null);
  } else if (authError.error?.error?.message === "EMAIL_NOT_FOUND") {
    Sweetalert.fnc("error", "No existe una cuenta con este correo electrónico.", null);
  } else if (authError.error?.error?.message === "USER_DISABLED") {
    Sweetalert.fnc("error", "Esta cuenta ha sido deshabilitada.", null);
  } else {
    Sweetalert.fnc("error", "Error al iniciar sesión. Por favor, intenta nuevamente.", null);
  }
  
  console.error("Error de autenticación:", authError);
}

  /**
   * Actualiza el token del usuario en la base de datos
   */
  private updateUserToken(id: string, value: any, authData: any): void {
  console.log("➡️ Entrando a updateUserToken()");
  console.log("Parámetros recibidos:", { id, value, authData });

  // Pasamos el token explícitamente como tercer parámetro
  this.usersService.patchData(id, value, value.idToken).subscribe(
    (resp3: any) => {
      console.log("✅ Respuesta patchData:", resp3);

      if (resp3 && resp3["idToken"] !== "") {
        console.log("✔️ idToken recibido en patchData:", resp3["idToken"]);

        this.storeUserData(resp3, authData);
        console.log("ℹ️ storeUserData ejecutado con:", { resp3, authData });

        // Convertir a JWT antes de redireccionar
        console.log("➡️ Llamando a convertToJWT con idToken:", resp3["idToken"]);
        this.authService.convertToJWT(resp3["idToken"]).subscribe(
          jwtResponse => {
            console.log("✅ Respuesta convertToJWT:", jwtResponse);
            this.handleJwtResponse(jwtResponse);
          },
          error => {
            console.error("❌ Error al convertir token en convertToJWT:", error);
            // Redireccionar de todos modos ya que el login principal funcionó
            console.warn("⚠️ Redirigiendo de todos modos al dashboard");
            this.redirectToDashboard();
          }
        );
      } else {
        console.warn("⚠️ No se recibió idToken válido en patchData:", resp3);
      }
    },
    error => {
      this.isLoading = false;
      Sweetalert.fnc("error", "Error al actualizar el token de usuario", null);
      console.error("❌ Error en patchData:", error);
    }
  );
}


  /**
   * Almacena los datos del usuario en el localStorage
   */
  private storeUserData(userData: any, authData: any): void {
      // Almacenamos el firebaseUid
      if (authData["localId"]) {
        localStorage.setItem("firebaseUid", authData["localId"]);
        // Cargar permisos del usuario
        this.rolesService.getUserPermissions(authData["localId"]).subscribe(
          permisos => {
            if (permisos) {
              localStorage.setItem("userPermissions", JSON.stringify(permisos));
              localStorage.setItem("userRole", "loaded");
              console.log("✅ Permisos cargados:", permisos);
            }
          },
          err => console.error("⚠️ Error al cargar permisos:", err)
        );
      }
    // Almacenamos el Token de seguridad en el localstorage
    localStorage.setItem("idToken", userData["idToken"]);
    localStorage.setItem("firebaseRefreshToken", authData["refreshToken"]);

    // Almacenamos el email en el localstorage
    localStorage.setItem("email", authData["email"]);

    // Almacenamos la fecha de expiración en el localstorage
    let today = new Date();
    today.setSeconds(authData["expiresIn"]);
    localStorage.setItem("expiresIn", today.getTime().toString());

    // Almacenamos recordar email en el localStorage
    if (this.rememberMe) {
      localStorage.setItem("rememberMe", "yes");
    } else {
      localStorage.setItem("rememberMe", "no");
    }
  }

  /**
 * Maneja la respuesta JWT
 */
private handleJwtResponse(jwtResponse: any): void {
  console.log("➡️ Entrando a handleJwtResponse");
  console.log("JWT Response recibido:", jwtResponse);

  // Verificar qué claves realmente existen en la respuesta
  console.log("Access token recibido:", jwtResponse?.access_token);
  console.log("Refresh token recibido:", jwtResponse?.refresh_token);

  // Almacenar tokens JWT
  localStorage.setItem("jwt_token", jwtResponse?.access_token || "SIN_ACCESS_TOKEN");
  localStorage.setItem("refresh_token", jwtResponse?.refresh_token || "SIN_REFRESH_TOKEN");

  console.log("✅ Tokens guardados en localStorage:", {
    jwt_token: localStorage.getItem("jwt_token"),
    refresh_token: localStorage.getItem("refresh_token")
  });

  // Redireccionar a perfil
  this.redirectToDashboard();
}


  /**
 * Redirecciona al dashboard
 */
private redirectToDashboard(): void {
  console.log("➡️ Entrando a redirectToDashboard");
  this.isLoading = false;

  // Verificar que se haga la navegación
  this.router.navigateByUrl('select-account').then(
    success => console.log("✅ Navegación a dashboard exitosa:", success),
    error => console.error("❌ Error en navegación a dashboard:", error)
  );
}
/**
   * Reenvía el correo de verificación
   */
  reenviarVerificacion(): void {
    const email = this.loginForm.get('email')?.value;
    if (!email) {
      Sweetalert.fnc("error", "Ingresa tu correo electrónico primero", null);
      return;
    }
    this.enviandoVerificacion = true;
    this.usersService.sendBrandedEmailVerification(email).subscribe(
      (resp: any) => {
        this.enviandoVerificacion = false;
        if (resp.success) {
          Sweetalert.fnc("success", "Correo de verificación reenviado. Revisa tu bandeja y spam", null);
        } else {
          Sweetalert.fnc("error", "Error al reenviar el correo", null);
        }
      },
      (error) => {
        this.enviandoVerificacion = false;
        Sweetalert.fnc("error", "Error al reenviar el correo de verificación", null);
      }
    );
  }

}



