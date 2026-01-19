import { NgModule, CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

// Importa MaterialModule
import { MaterialModule } from '../../shared/material.module';

// Importaciones específicas de Material que podrían necesitarse en pagos
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatNativeDateModule } from '@angular/material/core';
// Importa el componente principal y el modal
import { PagosComponent } from './pagos.component';
import { PagoFormModalComponent } from './pago-form-modal/pago-form-modal.component';

@NgModule({ declarations: [
        PagosComponent,
        PagoFormModalComponent
    ],
    exports: [
        PagosComponent
        // Exporta también los otros componentes si son necesarios fuera de este módulo
    ],
    schemas: [CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA], imports: [CommonModule,
        RouterModule,
        FormsModule,
        ReactiveFormsModule,
        MaterialModule,
        // Importaciones específicas
        MatTableModule,
        MatPaginatorModule,
        MatSortModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatIconModule,
        MatDialogModule,
        MatSelectModule,
        MatDatepickerModule,
        MatSnackBarModule,
        MatProgressSpinnerModule,
        MatNativeDateModule], providers: [provideHttpClient(withInterceptorsFromDi())] })
export class PagosModule { }