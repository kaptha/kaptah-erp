import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { BranchTransferService, CreateBranchTransferDto } from '../../../services/inventory/branch-transfer.service';
import { BranchInventoryService, BranchInventoryWithDetails } from '../../../services/inventory/branch-inventory.service';
import { SucursalesService } from '../../../services/sucursales.service';
import { UsersService } from '../../../services/users.service';

interface TransferItem {
  product_id: number;
  product_name: string;
  product_code: string;
  quantity: number;
  available_stock: number;
  cost: number;
}

@Component({
  selector: 'app-transfer-form-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    MatTooltipModule
  ],
  templateUrl: './transfer-form-modal.component.html',
  styleUrls: ['./transfer-form-modal.component.css']
})
export class TransferFormModalComponent implements OnInit {
  transferForm: FormGroup;
  loading = false;
  loadingProducts = false;
  branches: any[] = [];
  sourceInventory: BranchInventoryWithDetails[] = [];
  transferItems: TransferItem[] = [];
  userName: string = '';

  // Para agregar productos
  selectedProductId: number | null = null;
  selectedQuantity: number = 1;

  displayedColumns: string[] = ['product', 'available', 'quantity', 'cost', 'subtotal', 'actions'];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<TransferFormModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private branchTransferService: BranchTransferService,
    private branchInventoryService: BranchInventoryService,
    private sucursalesService: SucursalesService,
    private usersService: UsersService,
    private snackBar: MatSnackBar
  ) {
    this.transferForm = this.fb.group({
      from_branch_id: ['', Validators.required],
      to_branch_id: ['', Validators.required],
      notes: ['']
    });
  }

  ngOnInit(): void {
    this.loadUserAndBranches();

    // Cuando cambia la sucursal origen, cargar su inventario
    this.transferForm.get('from_branch_id')?.valueChanges.subscribe(branchId => {
      if (branchId) {
        this.loadSourceInventory(branchId);
        this.transferItems = [];
        this.selectedProductId = null;
      }
    });
  }

  loadUserAndBranches(): void {
    const idToken = localStorage.getItem('idToken');
    if (!idToken) {
      this.snackBar.open('No se encontró token de autenticación', 'Cerrar', { duration: 3000 });
      return;
    }

    this.usersService.getUserByToken(idToken).subscribe({
      next: (user) => {
        this.userName = user.name || user.email || 'Usuario';
        this.loadBranches();
      },
      error: (error) => {
        console.error('Error al obtener usuario:', error);
        this.snackBar.open('Error al cargar datos del usuario', 'Cerrar', { duration: 3000 });
      }
    });
  }

  loadBranches(): void {
    this.sucursalesService.getSucursales().subscribe({
      next: (branches) => {
        this.branches = branches;
      },
      error: (error) => {
        console.error('Error al cargar sucursales:', error);
        this.snackBar.open('Error al cargar sucursales', 'Cerrar', { duration: 3000 });
      }
    });
  }

  loadSourceInventory(branchId: number): void {
    this.loadingProducts = true;
    this.sourceInventory = [];

    this.branchInventoryService.getInventoryByBranch(branchId).subscribe({
      next: (inventory) => {
        // Solo mostrar productos con stock > 0
        this.sourceInventory = inventory.filter(item => item.quantity > 0);
        this.loadingProducts = false;
      },
      error: (error) => {
        console.error('Error al cargar inventario:', error);
        this.snackBar.open('Error al cargar inventario de la sucursal', 'Cerrar', { duration: 3000 });
        this.loadingProducts = false;
      }
    });
  }

  get availableProducts(): BranchInventoryWithDetails[] {
    const addedIds = this.transferItems.map(item => item.product_id);
    return this.sourceInventory.filter(inv => !addedIds.includes(inv.product_id));
  }

  get destinationBranches(): any[] {
    const fromId = this.transferForm.get('from_branch_id')?.value;
    return this.branches.filter(b => b.id !== fromId);
  }

  addProduct(): void {
    if (!this.selectedProductId || this.selectedQuantity <= 0) {
      this.snackBar.open('Selecciona un producto y cantidad válida', 'Cerrar', { duration: 3000 });
      return;
    }

    const inventoryItem = this.sourceInventory.find(inv => inv.product_id === this.selectedProductId);
    if (!inventoryItem) return;

    if (this.selectedQuantity > inventoryItem.quantity) {
      this.snackBar.open(
        `Stock insuficiente. Disponible: ${inventoryItem.quantity}`,
        'Cerrar',
        { duration: 3000 }
      );
      return;
    }

    this.transferItems = [...this.transferItems, {
      product_id: inventoryItem.product_id,
      product_name: inventoryItem.product_name,
      product_code: inventoryItem.product_code,
      quantity: this.selectedQuantity,
      available_stock: inventoryItem.quantity,
      cost: inventoryItem.cost
    }];

    this.selectedProductId = null;
    this.selectedQuantity = 1;
  }

  removeProduct(index: number): void {
    this.transferItems = this.transferItems.filter((_, i) => i !== index);
  }

  updateQuantity(index: number, quantity: number): void {
    const item = this.transferItems[index];
    if (quantity <= 0) {
      this.snackBar.open('La cantidad debe ser mayor a 0', 'Cerrar', { duration: 2000 });
      return;
    }
    if (quantity > item.available_stock) {
      this.snackBar.open(
        `Stock insuficiente. Disponible: ${item.available_stock}`,
        'Cerrar',
        { duration: 2000 }
      );
      return;
    }
    this.transferItems[index] = { ...item, quantity };
    this.transferItems = [...this.transferItems];
  }

  getTotalItems(): number {
    return this.transferItems.reduce((sum, item) => sum + item.quantity, 0);
  }

  getTotalValue(): number {
    return this.transferItems.reduce((sum, item) => sum + (item.quantity * item.cost), 0);
  }

  onSubmit(): void {
    if (this.transferForm.invalid) {
      this.snackBar.open('Completa los campos requeridos', 'Cerrar', { duration: 3000 });
      return;
    }

    if (this.transferItems.length === 0) {
      this.snackBar.open('Agrega al menos un producto a la transferencia', 'Cerrar', { duration: 3000 });
      return;
    }

    const formValue = this.transferForm.getRawValue();

    if (formValue.from_branch_id === formValue.to_branch_id) {
      this.snackBar.open('La sucursal origen y destino no pueden ser la misma', 'Cerrar', { duration: 3000 });
      return;
    }

    this.loading = true;

    const createDto: CreateBranchTransferDto = {
      from_branch_id: formValue.from_branch_id,
      to_branch_id: formValue.to_branch_id,
      requested_by: this.userName,
      notes: formValue.notes || undefined,
      items: this.transferItems.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity,
        cost: item.cost
      }))
    };

    this.branchTransferService.createTransfer(createDto).subscribe({
      next: (result) => {
        this.snackBar.open('Transferencia creada exitosamente', 'Cerrar', { duration: 3000 });
        this.dialogRef.close(true);
      },
      error: (error) => {
        console.error('Error al crear transferencia:', error);
        this.snackBar.open(
          error.error?.message || 'Error al crear transferencia',
          'Cerrar',
          { duration: 3000 }
        );
        this.loading = false;
      }
    });
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}
