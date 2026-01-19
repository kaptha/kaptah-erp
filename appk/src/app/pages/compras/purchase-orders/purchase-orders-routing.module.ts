import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PurchaseOrdersComponent } from './purchase-orders.component';

const routes: Routes = [
  {
    path: '',
    component: PurchaseOrdersComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PurchaseOrdersRoutingModule { }