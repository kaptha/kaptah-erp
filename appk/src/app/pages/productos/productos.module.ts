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
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatMenuModule } from '@angular/material/menu';
// Importa los componentes
import { ProductosComponent } from './productos.component';
import { ModalProdComponent } from './modal-prod/modal-prod.component';

// Configura rutas si usas lazy loading
const routes = [
  {
    path: '',
    component: ProductosComponent
  }
];

@NgModule({
  declarations: [
    ProductosComponent,
    ModalProdComponent
  ],
  imports: [
    CommonModule,
    RouterModule.forChild(routes), // Para lazy loading, si no lo usas, cambia a RouterModule
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
    MatProgressSpinnerModule,
    MatMenuModule
  ],
  exports: [
    ProductosComponent,
    ModalProdComponent
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA]
})
export class ProductosModule { }