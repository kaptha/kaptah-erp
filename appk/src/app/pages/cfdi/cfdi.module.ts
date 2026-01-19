import { NgModule, CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

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
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

// Importación para el componente de búsqueda
import { NgxMatSelectSearchModule } from 'ngx-mat-select-search';

// Importa los componentes
import { CFDIComponent } from './cfdi.component';
import { AddCfdiModalComponent } from './add-cfdi-modal/add-cfdi-modal.component';
import { AddCfdiNominaModalComponent } from './add-cfdi-nomina-modal/add-cfdi-nomina-modal.component';
import { AddCfdiPagoModalComponent } from './add-cfdi-pago-modal/add-cfdi-pago-modal.component';
import { AddCartaPorteModalComponent } from './add-carta-porte-modal/add-carta-porte-modal.component';

// Configura rutas si usas lazy loading
const routes = [
  {
    path: '',
    component: CFDIComponent
  }
];

@NgModule({
  declarations: [
    CFDIComponent,
    AddCfdiModalComponent,
    AddCfdiNominaModalComponent,
    AddCfdiPagoModalComponent,
    AddCartaPorteModalComponent
  ],
  imports: [
    CommonModule,
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
    MatDatepickerModule,
    MatNativeDateModule,
    MatCheckboxModule,
    MatSnackBarModule,
    MatMenuModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    // Otras importaciones
    NgxMatSelectSearchModule
  ],
  exports: [
    CFDIComponent,
    AddCfdiModalComponent
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA]
})
export class CFDIModule { }