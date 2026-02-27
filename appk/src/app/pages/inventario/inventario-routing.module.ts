import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { BranchInventoryListComponent } from './branch-inventory-list/branch-inventory-list.component';
import { BranchTransfersListComponent } from './branch-transfers-list/branch-transfers-list.component';
import { StockAlertsComponent } from './stock-alerts/stock-alerts.component';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'inventario-sucursales',
    pathMatch: 'full'
  },
  {
    path: 'inventario-sucursales',
    component: BranchInventoryListComponent
  },
  {
    path: 'transferencias',
    component: BranchTransfersListComponent
  },
  {
    path: 'alertas',
    component: StockAlertsComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class InventarioRoutingModule { }