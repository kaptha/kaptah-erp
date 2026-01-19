import { NgModule, CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { RegisterComponent } from './register/register.component';
import { PasswordResetDialogComponent } from './password-reset-dialog/password-reset-dialog.component';
import { ResetPasswordComponent } from './reset-password/reset-password.component';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TermsDialogComponent } from './terms-dialog/terms-dialog.component';

@NgModule({
  declarations: [
    LoginComponent,
    RegisterComponent,
    PasswordResetDialogComponent,
    ResetPasswordComponent,
    TermsDialogComponent
  ],
  exports: [
    LoginComponent,
    RegisterComponent,
    PasswordResetDialogComponent,
    ResetPasswordComponent
  ],
  imports: [
    ReactiveFormsModule,
    RouterModule,
    CommonModule,
    MatCheckboxModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatDialogModule,
    MatIconModule,
    MatSnackBarModule,
    MatProgressSpinnerModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA]
})
export class AuthModule { }
