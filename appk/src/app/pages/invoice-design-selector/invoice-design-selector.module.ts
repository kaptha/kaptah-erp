import { NgModule, CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

// Importa MaterialModule
import { MaterialModule } from '../../shared/material.module';

// Importaciones específicas de Material para este componente
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBarModule } from '@angular/material/snack-bar';

// Importa el componente
import { InvoiceDesignSelectorComponent } from './invoice-design-selector.component';

@NgModule({
  declarations: [
    InvoiceDesignSelectorComponent
  ],
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    MaterialModule,
    // Importaciones específicas
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatSnackBarModule
  ],
  exports: [
    InvoiceDesignSelectorComponent
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA]
})
export class InvoiceDesignSelectorModule { }