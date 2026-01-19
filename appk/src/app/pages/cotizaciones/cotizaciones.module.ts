import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { NgxMatSelectSearchModule } from 'ngx-mat-select-search';

// Angular Material
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSortModule } from '@angular/material/sort';

// Componentes
import { CotizacionesComponent } from './cotizaciones.component';
import { ModalCotComponent } from './modal-cot/modal-cot.component';
import { SendQuotationDialogComponent } from './send-quotation-dialog/send-quotation-dialog.component';
// Servicios
import { CotizacionesService } from '../../services/cotizaciones.service';

@NgModule({ declarations: [
        CotizacionesComponent,
        ModalCotComponent,
        SendQuotationDialogComponent
    ],
    exports: [CotizacionesComponent], imports: [CommonModule,
        RouterModule,
        FormsModule,
        ReactiveFormsModule,
        NgxMatSelectSearchModule,
        MatTableModule,
        MatButtonModule,
        MatIconModule,
        MatMenuModule,
        MatChipsModule,
        MatDialogModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatDatepickerModule,
        MatNativeDateModule,
        MatProgressSpinnerModule,
        MatSnackBarModule,
        MatDividerModule,
        MatPaginatorModule,
        MatAutocompleteModule,
        MatCheckboxModule,
        MatTooltipModule,
        MatSortModule], providers: [
        CotizacionesService,
        provideHttpClient(withInterceptorsFromDi())
    ] })
export class CotizacionesModule { }