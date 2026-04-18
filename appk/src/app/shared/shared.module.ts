import { NgModule, CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MaterialModule } from './material.module';

// Importa componentes compartidos
import { SidebarComponent } from './sidebar/sidebar.component';
import { HasPermissionDirective } from '../directives/has-permission.directive';
import { HeaderComponent } from './header/header.component';

@NgModule({
  declarations: [
    SidebarComponent,
    HeaderComponent,
HasPermissionDirective
  ],
  exports: [
    // Exporta componentes
    SidebarComponent,
    HeaderComponent,
HasPermissionDirective,
    // Exporta módulos para que estén disponibles en módulos que importan SharedModule
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    MaterialModule
  ],
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    MaterialModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA]
})
export class SharedModule { }
