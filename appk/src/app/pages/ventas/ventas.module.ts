import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: 'delivery',
    loadChildren: () => import('./delivery/delivery.module').then(m => m.DeliveryModule)
  },
  {
    path: 'notes',
    loadChildren: () => import('./notes/notes.module').then(m => m.NotesModule)
  },
  {
    path: 'orders',
    loadChildren: () => import('./orders/orders.module').then(m => m.OrdersModule)
  },
  {
    path: '',
    redirectTo: 'notes',
    pathMatch: 'full'
  }
];

@NgModule({
  imports: [
    CommonModule,
    RouterModule.forChild(routes)
    // ❌ NO importes DeliveryModule, NotesModule, OrdersModule aquí
    // ❌ NO uses schemas aquí
  ]
})
export class VentasModule { }