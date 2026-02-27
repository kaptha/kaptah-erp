import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { InventarioRoutingModule } from './inventario-routing.module';
import { SharedModule } from '../../shared/shared.module';

// Material Modules
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatMenuModule } from '@angular/material/menu';
import { MatChipsModule } from '@angular/material/chips';

// Components
import { BranchInventoryListComponent } from './branch-inventory-list/branch-inventory-list.component';
import { BranchInventoryModalComponent } from './branch-inventory-modal/branch-inventory-modal.component';
import { BranchTransfersListComponent } from './branch-transfers-list/branch-transfers-list.component';
import { TransferFormModalComponent } from './transfer-form-modal/transfer-form-modal.component';
import { TransferDetailModalComponent } from './transfer-detail-modal/transfer-detail-modal.component';
import { StockAlertsComponent } from './stock-alerts/stock-alerts.component';

// Services
import { BranchInventoryService } from '../../services/inventory/branch-inventory.service';
import { BranchTransferService } from '../../services/inventory/branch-transfer.service';

@NgModule({
  declarations: [
    BranchInventoryListComponent,
    BranchInventoryModalComponent,
    BranchTransfersListComponent,
    TransferFormModalComponent,
    TransferDetailModalComponent,
    StockAlertsComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    InventarioRoutingModule,
    SharedModule,
    MatTableModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDialogModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatMenuModule,
    MatChipsModule
  ],
  providers: [
    BranchInventoryService,
    BranchTransferService
  ]
})
export class InventarioModule { }