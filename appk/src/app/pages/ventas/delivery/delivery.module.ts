import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MaterialModule } from '../../../shared/material.module';
import { MatMenuModule } from '@angular/material/menu';

// Componentes
import { DeliveryComponent } from './delivery.component';
import { DeliveryFormModalComponent } from './delivery-form-modal/delivery-form-modal.component';
import { SendDeliveryDialogComponent } from './send-delivery-dialog/send-delivery-dialog.component'; // <-- Agregar
import { DeliveryListComponent } from './delivery-list/delivery-list.component';
const routes = [
  {
    path: '',
    component: DeliveryComponent
  }
];

@NgModule({
  declarations: [
    DeliveryComponent,
    DeliveryFormModalComponent,
    SendDeliveryDialogComponent,
    DeliveryListComponent
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
    DeliveryComponent,
    DeliveryFormModalComponent
  ]
})
export class DeliveryModule { }