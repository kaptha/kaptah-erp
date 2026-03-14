import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { BranchInventoryService, CreateBranchInventoryDto, UpdateBranchInventoryDto } from '../../../services/inventory/branch-inventory.service';
import { ProductService } from '../../../services/inventory/product.service';
import { SucursalesService } from '../../../services/sucursales.service';
import { UsersService } from '../../../services/users.service';

interface DialogData {
  mode: 'create' | 'edit';
  item?: any;
}

@Component({
  selector: 'app-branch-inventory-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './branch-inventory-modal.component.html',
  styleUrls: ['./branch-inventory-modal.component.css']
})
export class BranchInventoryModalComponent implements OnInit {
  inventoryForm: FormGroup;
  loading = false;
  products: any[] = [];
  branches: any[] = [];
  mode: 'create' | 'edit';
  userId: string = '';

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<BranchInventoryModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
    private branchInventoryService: BranchInventoryService,
    private productService: ProductService,
    private sucursalesService: SucursalesService,
    private usersService: UsersService,
    private snackBar: MatSnackBar
  ) {
    this.mode = data.mode;

    this.inventoryForm = this.fb.group({
      branch_id: [{ value: '', disabled: this.mode === 'edit' }, Validators.required],
      product_id: [{ value: '', disabled: this.mode === 'edit' }, Validators.required],
      quantity: [0, [Validators.required, Validators.min(0)]],
      min_stock: [10, [Validators.required, Validators.min(0)]],
      max_stock: [100, Validators.min(0)],
      cost: [0, [Validators.required, Validators.min(0)]]
    });

    if (this.mode === 'edit' && data.item) {
      this.inventoryForm.patchValue({
        branch_id: data.item.branch_id,
        product_id: data.item.product_id,
        quantity: data.item.quantity,
        min_stock: data.item.min_stock,
        max_stock: data.item.max_stock,
        cost: data.item.cost
      });
    }
  }

  ngOnInit(): void {
    this.loadUserAndData();
  }

  loadUserAndData(): void {
    const idToken = localStorage.getItem('idToken');
    if (!idToken) {
      this.snackBar.open('No se encontr\u00f3 token de autenticaci\u00f3n', 'Cerrar', { duration: 3000 });
      return;
    }

    this.usersService.getUserByToken(idToken).subscribe({
      next: (user) => {
        this.userId = user.id;
        this.loadProducts();
        this.loadBranches();
      },
      error: (error) => {
        console.error('Error al obtener usuario:', error);
        this.snackBar.open('Error al cargar datos del usuario', 'Cerrar', { duration: 3000 });
      }
    });
  }

  loadProducts(): void {
    this.productService.getProducts().subscribe({
      next: (products) => {
        this.products = products.filter(p => p.active);
      },
      error: (error) => {
        console.error('Error al cargar productos:', error);
        this.snackBar.open('Error al cargar productos', 'Cerrar', { duration: 3000 });
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

  onSubmit(): void {
    if (this.inventoryForm.invalid) {
      this.snackBar.open('Por favor completa todos los campos requeridos', 'Cerrar', { duration: 3000 });
      return;
    }

    this.loading = true;

    if (this.mode === 'create') {
      this.createInventory();
    } else {
      this.updateInventory();
    }
  }

  createInventory(): void {
    const formValue = this.inventoryForm.getRawValue();

    const createDto: CreateBranchInventoryDto = {
      userId: this.userId,
      branch_id: formValue.branch_id,
      product_id: formValue.product_id,
      quantity: formValue.quantity,
      min_stock: formValue.min_stock,
      max_stock: formValue.max_stock,
      cost: formValue.cost
    };

    this.branchInventoryService.createInventory(createDto).subscribe({
      next: (result) => {
        this.snackBar.open('Inventario creado exitosamente', 'Cerrar', { duration: 3000 });
        this.dialogRef.close(true);
      },
      error: (error) => {
        console.error('Error al crear inventario:', error);
        this.snackBar.open(
          error.error?.message || 'Error al crear inventario',
          'Cerrar',
          { duration: 3000 }
        );
        this.loading = false;
      }
    });
  }

  updateInventory(): void {
    const formValue = this.inventoryForm.getRawValue();

    const updateDto: UpdateBranchInventoryDto = {
      quantity: formValue.quantity,
      min_stock: formValue.min_stock,
      max_stock: formValue.max_stock,
      cost: formValue.cost
    };

    this.branchInventoryService.updateInventory(this.data.item.id, updateDto).subscribe({
      next: (result) => {
        this.snackBar.open('Inventario actualizado exitosamente', 'Cerrar', { duration: 3000 });
        this.dialogRef.close(true);
      },
      error: (error) => {
        console.error('Error al actualizar inventario:', error);
        this.snackBar.open(
          error.error?.message || 'Error al actualizar inventario',
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
