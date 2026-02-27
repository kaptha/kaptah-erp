import { Routes, RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';

import { authGuard } from '../guards/auth.guard';

import { PagesComponent } from './pages.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { PerfilComponent } from './perfil/perfil.component';
import { ClientesComponent } from './clientes/clientes.component';
import { CategoriasComponent } from './categorias/categorias.component';
import { ProductosComponent } from './productos/productos.component';
import { ProveedoresComponent } from './proveedores/proveedores.component';
import { ServiciosComponent } from './servicios/servicios.component';
import { IngresosComponent } from './ingresos/ingresos.component';
import { EgresosComponent } from './egresos/egresos.component';
import { CobrosComponent } from './cobros/cobros.component';
import { PagosComponent } from './pagos/pagos.component';
import { EmpleadosComponent } from './empleados/empleados.component';
import { CotizacionesComponent } from './cotizaciones/cotizaciones.component';
import { OrdersComponent } from './ventas/orders/orders.component';
import { DeliveryComponent } from './ventas/delivery/delivery.component';
import { NotesComponent } from './ventas/notes/notes.component';
import { InvoiceDesignSelectorComponent } from './invoice-design-selector/invoice-design-selector.component';
import { CFDIComponent } from './cfdi/cfdi.component';

const routes: Routes = [
    { 
        path: 'dashboard', 
        component: PagesComponent,
        canActivate: [authGuard],        
        children: [
            { path: '', component: DashboardComponent },            
            { path: 'perfil', component: PerfilComponent },
            { path: 'clientes', component: ClientesComponent },
            { path: 'categorias', component: CategoriasComponent },
            { path: 'productos', component: ProductosComponent },
            { path: 'proveedores', component: ProveedoresComponent },
            { path: 'servicios', component: ServiciosComponent },
            { path: 'cotizaciones', component: CotizacionesComponent },
            { path: 'ventas/orders', component: OrdersComponent},
            { path: 'ventas/notes', component: NotesComponent},
            { path: 'ventas/delivery', component: DeliveryComponent},
            { path: 'ingresos', component: IngresosComponent },
            { path: 'egresos', component: EgresosComponent },
            { path: 'cobros', component: CobrosComponent },
            { path: 'pagos', component: PagosComponent },
            { path: 'empleados', component: EmpleadosComponent },
            { path: 'cfdi', component: CFDIComponent },
            { path: 'invoice-design-selector', component: InvoiceDesignSelectorComponent },
            { 
                path: 'compras/purchase-orders', 
                loadChildren: () => import('./compras/purchase-orders/purchase-orders.module')
                    .then(m => m.PurchaseOrdersModule)
            },
        ]
    },
];

@NgModule({
    imports: [ RouterModule.forChild(routes) ],
    exports: [ RouterModule ]
})
export class PagesRoutingModule {}