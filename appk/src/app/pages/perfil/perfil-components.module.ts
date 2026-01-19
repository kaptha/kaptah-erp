import { NgModule, CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

// Importa MaterialModule y componentes específicos de Material
import { MaterialModule } from '../../shared/material.module';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBarModule } from '@angular/material/snack-bar';

// Importa componentes del perfil
import { PerfilComponent } from './perfil.component';
import { SucursalModalComponent } from './sucursal-modal/sucursal-modal.component';
import { ImpuestoModalComponent } from './impuesto-modal/impuesto-modal.component';
import { CsdUploadModalComponent } from './csd-upload-modal/csd-upload-modal.component';
import { FielUploadModalComponent } from './fiel-upload-modal/fiel-upload-modal.component';


import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
@NgModule({ declarations: [
        PerfilComponent,
        SucursalModalComponent,
        ImpuestoModalComponent,
        CsdUploadModalComponent,
        FielUploadModalComponent
    ],
    exports: [
        PerfilComponent,
        SucursalModalComponent,
        ImpuestoModalComponent,
        CsdUploadModalComponent,
        FielUploadModalComponent
    ],
    schemas: [CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA], imports: [CommonModule,
        RouterModule,
        FormsModule,
        ReactiveFormsModule,
        MaterialModule,
        // Importaciones específicas de Material
        MatDialogModule,
        MatButtonModule,
        MatIconModule,
        MatFormFieldModule,
        MatInputModule,
        MatTableModule,
        MatSelectModule,
        MatProgressBarModule,
        MatSnackBarModule], providers: [provideHttpClient(withInterceptorsFromDi())] })
export class PerfilComponentsModule { }