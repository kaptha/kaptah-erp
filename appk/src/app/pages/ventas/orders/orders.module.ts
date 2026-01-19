import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MaterialModule } from '../../../shared/material.module';
import { MatMenuModule } from '@angular/material/menu';

// Componentes
import { OrdersComponent } from './orders.component';
import { OrderFormModalComponent } from './order-form-modal/order-form-modal.component';
import { SendOrderDialogComponent } from './send-order-dialog/send-order-dialog.component'; // <-- CORREGIR NOMBRE
import { OrderDetailComponent } from './order-detail/order-detail.component';
const routes = [
  {
    path: '',
    component: OrdersComponent
  }
];

@NgModule({
  declarations: [
    OrdersComponent,
    OrderFormModalComponent,
    SendOrderDialogComponent,
    OrderDetailComponent
  ],
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    FormsModule,
    ReactiveFormsModule,
    MaterialModule,
    MatMenuModule
  ],
  exports: [
    OrdersComponent,
    OrderFormModalComponent
  ]
  // ✅ NO agregar schemas
})
export class OrdersModule { }