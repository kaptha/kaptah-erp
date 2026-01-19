import { NgModule, CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { MaterialModule } from './material.module';

// Importa componentes compartidos
import { SidebarComponent } from './sidebar/sidebar.component';
import { HeaderComponent } from './header/header.component';

@NgModule({
  declarations: [
    SidebarComponent,
    HeaderComponent
    // Otros componentes compartidos
  ],
  exports: [
    // Exporta componentes
    SidebarComponent,
    HeaderComponent,
    
    // Exporta módulos para que estén disponibles en módulos que importan SharedModule
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    MaterialModule
  ],
  imports: [
    CommonModule,
    RouterModule, // Necesario para routerLink en componentes compartidos
    FormsModule,
    ReactiveFormsModule,
    MaterialModule // Incluye todos los componentes de Angular Material
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA] // Para prevenir errores con componentes desconocidos
})
export class SharedModule { }
