import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BranchInventoryService } from '../../../services/inventory/branch-inventory.service';
import { ProductService } from '../../../services/inventory/product.service';
import { SucursalesService } from '../../../services/sucursales.service';
import { UsersService } from '../../../services/users.service';

@Component({
  selector: 'app-branch-inventory-modal',
  templateUrl: './branch-inventory-modal.component.html',
  styleUrls: ['./branch-inventory-modal.component.css']
})
export class BranchInventoryModalComponent implements OnInit {
  form: FormGroup;
  mode: 'create' | 'edit';
  branches: any[] = [];
  products: any[] = [];
  loading: boolean = false;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<BranchInventoryModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private branchInventoryService: BranchInventoryService,
    private productService: ProductService,
    private sucursalesService: SucursalesService,
    private usersService: UsersService,
    private snackBar: MatSnackBar
  ) {
    this.mode = data.mode;
    this.form = this.fb.group({
      branch_id: [data.item?.branch_id || null, Validators.required],
      product_id: [data.item?.product_id || null, Validators.required],
      quantity: [data.item?.quantity || 0, [Validators.required, Validators.min(0)]],
      min_stock: [data.item?.min_stock || 0, [Validators.required, Validators.min(0)]],
      max_stock: [data.item?.max_stock || null, Validators.min(0)],
      cost: [data.item?.cost || 0, [Validators.required, Validators.min(0)]]
    });

    if (this.mode === 'edit') {
      // En modo edición, deshabilitar sucursal y producto
      this.form.get('branch_id')?.disable();
      this.form.get('product_id')?.disable();
    }
  }

  ngOnInit(): void {
    this.loadBranches();
    this.loadProducts();
  }

  loadBranches(): void {
    this.sucursalesService.getSucursales().subscribe({
      next: (branches) => {
        this.branches = branches;
      },
      error: (error) => {
        console.error('Error al cargar sucursales:', error);
      }
    });
  }

  loadProducts(): void {
    this.productService.getProducts().subscribe({
      next: (products) => {
        this.products = products;
      },
      error: (error) => {
        console.error('Error al cargar productos:', error);
      }
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.snackBar.open('Por favor completa todos los campos requeridos', 'Cerrar', { duration: 3000 });
      return;
    }

    this.loading = true;
    const formValue = this.form.getRawValue(); // getRawValue incluye campos deshabilitados

    if (this.mode === 'create') {
      this.createInventory(formValue);
    } else {
      this.updateInventory(formValue);
    }
  }

  createInventory(data: any): void {
    const idToken = localStorage.getItem('idToken');
    if (!idToken) {
      this.snackBar.open('No se encontró token de autenticación', 'Cerrar', { duration: 3000 });
      this.loading = false;
      return;
    }

    this.usersService.getUserByToken(idToken).subscribe({
      next: (user) => {
        const payload = {
          ...data,
          userId: user.id
        };

        this.branchInventoryService.createInventory(payload).subscribe({
          next: () => {
            this.snackBar.open('Inventario creado correctamente', 'Cerrar', { duration: 3000 });
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
      },
      error: (error) => {
        console.error('Error al obtener usuario:', error);
        this.loading = false;
      }
    });
  }

  updateInventory(data: any): void {
    const updateData = {
      quantity: data.quantity,
      min_stock: data.min_stock,
      max_stock: data.max_stock,
      cost: data.cost
    };

    this.branchInventoryService.updateInventory(this.data.item.id, updateData).subscribe({
      next: () => {
        this.snackBar.open('Inventario actualizado correctamente', 'Cerrar', { duration: 3000 });
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
