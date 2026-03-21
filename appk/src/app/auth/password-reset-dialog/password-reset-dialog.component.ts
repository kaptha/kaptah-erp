import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { UsersService  } from '../../services/users.service';

import { Sweetalert } from '../../functions';

@Component({
    selector: 'app-password-reset-dialog',
    templateUrl: './password-reset-dialog.component.html',
    styleUrls: ['./password-reset-dialog.component.css'],
    encapsulation: ViewEncapsulation.None,
    standalone: false
})
export class PasswordResetDialogComponent implements OnInit {
  passwordResetForm: FormGroup;

  constructor(public dialogRef: MatDialogRef<PasswordResetDialogComponent>,
              private usersService: UsersService,
              private fb: FormBuilder) {
                this.passwordResetForm = this.fb.group({
                  email: ['', [Validators.required, Validators.email]]
                });
              }
              ngOnInit(): void {
                this.dialogRef.addPanelClass('custom-dialog-container');
              }
  onSend(): void {
    if (this.passwordResetForm.valid) {
      const email = this.passwordResetForm.get('email')?.value;
      Sweetalert.fnc("Cargando", "Cargando...", null);

      this.usersService.sendBrandedPasswordReset(email).subscribe(
        (resp: any) => {
          Sweetalert.fnc("success", "Verifica tu correo para cambiar la contrasena", "login");
        },
        error => {
          Sweetalert.fnc("error", "Error al enviar el correo", null);
        }
      );

      this.dialogRef.close(email);
    }
  }

  onClose(): void {
    this.dialogRef.close();
  }
}
