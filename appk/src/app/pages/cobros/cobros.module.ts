import { NgModule, CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

// Importa MaterialModule y componentes específicos de Material
import { MaterialModule } from '../../shared/material.module';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatNativeDateModule } from '@angular/material/core';
// Importa el componente principal
import { CobrosComponent } from './cobros.component';
import { CobroFormModalComponent } from './cobro-form-modal/cobro-form-modal.component';
import { SendReminderDialogComponent } from './send-reminder-dialog/send-reminder-dialog.component';
// Configura rutas si usas lazy loading
const routes = [
  {
    path: '',
    component: CobrosComponent
  }
];

@NgModule({ declarations: [
        CobrosComponent,
        CobroFormModalComponent,
        SendReminderDialogComponent
    ],
    exports: [
        CobrosComponent
        // Exporta otros componentes relacionados con cobros si es necesario
    ],
    schemas: [CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA], imports: [CommonModule,
        RouterModule.forChild(routes), // Para lazy loading
        FormsModule,
        ReactiveFormsModule,
        MaterialModule,
        // Importaciones específicas de Material
        MatTableModule,
        MatPaginatorModule,
        MatSortModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatIconModule,
        MatDialogModule,
        MatSelectModule,
        MatSnackBarModule,
        MatDatepickerModule,
        MatProgressSpinnerModule,
        MatNativeDateModule], providers: [provideHttpClient(withInterceptorsFromDi())] })
export class CobrosModule { }