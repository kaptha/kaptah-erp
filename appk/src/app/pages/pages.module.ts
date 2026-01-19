import { NgModule, CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule, DatePipe, CurrencyPipe, SlicePipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';

import { SharedModule } from '../shared/shared.module';
import { MaterialModule } from '../shared/material.module';

// Importa tus módulos de componentes
import { EmpleadosModule } from './empleados/empleados.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { InvoiceDesignSelectorModule } from './invoice-design-selector/invoice-design-selector.module';
import { PagosModule } from './pagos/pagos.module';
import { PerfilComponentsModule } from './perfil/perfil-components.module';
import { ProductosModule } from './productos/productos.module';
import { ProveedoresModule } from './proveedores/proveedores.module';
import { ServiciosModule } from './servicios/servicios.module';
import { VentasModule } from './ventas/ventas.module';
import { CategoriasModule } from './categorias/categorias.module';
import { ClientesModule } from './clientes/clientes.module';
import { CobrosModule } from './cobros/cobros.module';
import { CotizacionesModule } from './cotizaciones/cotizaciones.module';
import { CFDIModule } from './cfdi/cfdi.module';
// Importa componentes
import { PagesComponent } from './pages.component';
import { IngresosComponent } from './ingresos/ingresos.component';
import { EgresosComponent } from './egresos/egresos.component';

// Intenta importar ngx-print si está disponible
// Si sigue dando error, puedes comentar esta línea
// import { NgxPrintModule } from 'ngx-print';
// Y reemplazarla con una importación condicional o quitar su uso

// Importa NgxChartsModule
import { NgxChartsModule } from '@swimlane/ngx-charts';
// Importa PdfViewerModule
import { PdfViewerModule } from 'ng2-pdf-viewer';


@NgModule({
  declarations: [    
    PagesComponent,
    IngresosComponent,
    EgresosComponent,
    // Todos los demás componentes están ya modularizados
  ],
  exports: [
    PagesComponent
  ],
  imports: [
    CommonModule,
    SharedModule, // SharedModule debe incluir RouterModule
    RouterModule, // Necesario para router-outlet
    ReactiveFormsModule,
    FormsModule,
    MaterialModule, // Incluye los componentes de Material como mat-sidenav

    // Módulos de terceros
    NgxChartsModule,
    PdfViewerModule,
    // Si NgxPrintModule sigue dando error, coméntalo
    // NgxPrintModule,

    // Módulos de componentes
    EmpleadosModule,
    DashboardModule,
    InvoiceDesignSelectorModule,
    PagosModule,
    PerfilComponentsModule,
    ProductosModule,
    ProveedoresModule,
    ServiciosModule,
    VentasModule,
    CategoriasModule,
    ClientesModule,
    CobrosModule,
    CotizacionesModule,
    CFDIModule
  ],
  providers: [
    DatePipe,
    CurrencyPipe,
    SlicePipe
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA] // Ayuda a prevenir errores con componentes desconocidos
})
export class PagesModule { }
