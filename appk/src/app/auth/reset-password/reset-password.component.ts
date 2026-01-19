import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import { Sweetalert } from '../../functions';

import { UsersService } from '../../services/users.service';

@Component({
    selector: 'app-reset-password',
    templateUrl: './reset-password.component.html',
    styleUrls: ['./reset-password.component.css'],
    standalone: false
})
export class ResetPasswordComponent implements OnInit {
  resetPasswordForm: FormGroup;
  hide = true;

  constructor(private fb: FormBuilder,
              private usersService: UsersService,
              private activatedRoute: ActivatedRoute ) {
    this.resetPasswordForm = this.fb.group({
      password: ['', [
        Validators.required,
        Validators.minLength(8),
        Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
      ]],
      confirmPassword: ['', Validators.required]
    }, { validator: this.passwordMatchValidator });
  }

  ngOnInit(): void {
    /*=============================================
    Confirmar cambio de contraseña
    =============================================*/
    if (this.activatedRoute.snapshot.queryParams["oobCode"] != undefined &&
      this.activatedRoute.snapshot.queryParams["mode"] == "resetPassword") {

      let body = {
        oobCode: this.activatedRoute.snapshot.queryParams["oobCode"]
      }

      this.usersService.verifyPasswordResetCodeFnc(body)
        .subscribe((resp: any) => {
          if (resp["requestType"] !== "PASSWORD_RESET") {
            Sweetalert.fnc("error", "Necesita Confirmar su Correo", null);
          }
        });
    }
  }

  passwordMatchValidator(form: FormGroup) {
    return form.get('password')?.value === form.get('confirmPassword')?.value
      ? null : { mismatch: true };
      
  }

  get password() {
    return this.resetPasswordForm.get('password');
  }

  get confirmPassword() {
    return this.resetPasswordForm.get('confirmPassword');
  }

  onSubmit(): void {
    if (this.resetPasswordForm.valid) {
      const newPassword = this.resetPasswordForm.get('password')?.value;
      //console.log('Nueva contraseña:', newPassword);
      let body = {
        oobCode: this.activatedRoute.snapshot.queryParams["oobCode"],
        newPassword: newPassword
      };

      this.usersService.confirmPasswordResetFnc(body)
        .subscribe((resp: any) => {
          if (resp["requestType"] == "PASSWORD_RESET") {
            Sweetalert.fnc("success", "Contraseña cambiada, ahora puedes ingresar", "login");
          }
        });
    }
  }

  togglePasswordVisibility(): void {
    this.hide = !this.hide;
  }
  
}

