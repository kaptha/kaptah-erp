import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { BranchInventoryListComponent } from './branch-inventory-list/branch-inventory-list.component';
import { BranchTransfersListComponent } from './branch-transfers-list/branch-transfers-list.component';
import { BranchInventoryService } from '../../services/inventory/branch-inventory.service';
import { BranchTransferService } from '../../services/inventory/branch-transfer.service';

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
  }
  // Comentar alertas por ahora
  // {
  //   path: 'alertas',
  //   component: StockAlertsComponent
  // }
];

@NgModule({
  imports: [
    RouterModule.forChild(routes),
    BranchInventoryListComponent,
    BranchTransfersListComponent
    // NO importar StockAlertsComponent por ahora
  ],
  providers: [
    BranchInventoryService,
    BranchTransferService
  ]
})
export class InventarioModule { }
