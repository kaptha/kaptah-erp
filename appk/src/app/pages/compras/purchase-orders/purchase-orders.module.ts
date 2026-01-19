import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { PurchaseOrdersRoutingModule } from './purchase-orders-routing.module';

// Componentes
import { PurchaseOrdersComponent } from './purchase-orders.component';
import { PurchaseOrderFormModalComponent } from './purchase-order-form-modal/purchase-order-form-modal.component';
import { ReceivePurchaseOrderModalComponent } from './receive-purchase-order-modal/receive-purchase-order-modal.component';
import { SendPurchaseOrderDialogComponent } from './send-purchase-order-dialog/send-purchase-order-dialog.component';

// ngx-mat-select-search
import { NgxMatSelectSearchModule } from 'ngx-mat-select-search';

// Angular Material - TODOS los módulos necesarios
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSortModule } from '@angular/material/sort';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBarModule } from '@angular/material/snack-bar';

@NgModule({ declarations: [
        PurchaseOrdersComponent,
        PurchaseOrderFormModalComponent,
        ReceivePurchaseOrderModalComponent,
        SendPurchaseOrderDialogComponent
    ],
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
    exports: [
        PurchaseOrdersComponent
    ], imports: [CommonModule,
        ReactiveFormsModule,
        FormsModule,
        PurchaseOrdersRoutingModule,
        NgxMatSelectSearchModule,
        // Material Modules
        MatTableModule,
        MatButtonModule,
        MatIconModule,
        MatMenuModule,
        MatFormFieldModule,
        MatInputModule,
        MatProgressSpinnerModule,
        MatPaginatorModule,
        MatTooltipModule,
        MatSortModule,
        MatDialogModule,
        MatSelectModule,
        MatDatepickerModule,
        MatNativeDateModule,
        MatCardModule,
        MatDividerModule,
        MatSnackBarModule], providers: [provideHttpClient(withInterceptorsFromDi())] })
export class PurchaseOrdersModule { }

