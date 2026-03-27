import { Routes, RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';
import { authGuard } from '../guards/auth.guard';
import { PermissionGuard } from '../guards/permission.guard';
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
            { path: 'clientes', component: ClientesComponent, canActivate: [PermissionGuard], data: { module: 'clientes' } },
            { path: 'categorias', component: CategoriasComponent, canActivate: [PermissionGuard], data: { module: 'categorias' } },
            { path: 'productos', component: ProductosComponent, canActivate: [PermissionGuard], data: { module: 'productos' } },
            { path: 'proveedores', component: ProveedoresComponent, canActivate: [PermissionGuard], data: { module: 'proveedores' } },
            { path: 'servicios', component: ServiciosComponent, canActivate: [PermissionGuard], data: { module: 'servicios' } },
            { path: 'cotizaciones', component: CotizacionesComponent, canActivate: [PermissionGuard], data: { module: 'cotizaciones' } },
            { path: 'ventas/orders', component: OrdersComponent, canActivate: [PermissionGuard], data: { module: 'ordenes_venta' } },
            { path: 'ventas/notes', component: NotesComponent, canActivate: [PermissionGuard], data: { module: 'notas_venta' } },
            { path: 'ventas/delivery', component: DeliveryComponent, canActivate: [PermissionGuard], data: { module: 'guias_remision' } },
            { path: 'ingresos', component: IngresosComponent, canActivate: [PermissionGuard], data: { module: 'ingresos' } },
            { path: 'egresos', component: EgresosComponent, canActivate: [PermissionGuard], data: { module: 'egresos' } },
            { path: 'cobros', component: CobrosComponent, canActivate: [PermissionGuard], data: { module: 'cuentas_cobrar' } },
            { path: 'pagos', component: PagosComponent, canActivate: [PermissionGuard], data: { module: 'cuentas_pagar' } },
            { path: 'empleados', component: EmpleadosComponent, canActivate: [PermissionGuard], data: { module: 'empleados' } },
            { path: 'cfdi', component: CFDIComponent, canActivate: [PermissionGuard], data: { module: 'cfdi' } },
            { path: 'invoice-design-selector', component: InvoiceDesignSelectorComponent, canActivate: [PermissionGuard], data: { module: 'descarga_cfdi' } },
            {
                path: 'compras/purchase-orders',
                loadChildren: () => import('./compras/purchase-orders/purchase-orders.module')
                    .then(m => m.PurchaseOrdersModule),
                canActivate: [PermissionGuard], data: { module: 'ordenes_compra' }
            },
            {
                path: 'inventario',
                loadChildren: () => import('./inventario/inventario.module')
                    .then(m => m.InventarioModule),
                canActivate: [PermissionGuard], data: { module: 'inventario_multi_sucursal' }
            },
        ]
    },
];

@NgModule({
    imports: [ RouterModule.forChild(routes) ],
    exports: [ RouterModule ]
})
export class PagesRoutingModule {}
