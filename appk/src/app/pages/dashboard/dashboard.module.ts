import { NgModule, CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

// Importa MaterialModule
import { MaterialModule } from '../../shared/material.module';
import { NgxChartsModule } from '@swimlane/ngx-charts';
// Importaciones específicas de Material para dashboard
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

// Importa los componentes del dashboard
import { DashboardComponent } from './dashboard.component';

@NgModule({
  declarations: [
    DashboardComponent
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
    NgxChartsModule
  ],
  exports: [
    DashboardComponent
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA]
})
export class DashboardModule { }