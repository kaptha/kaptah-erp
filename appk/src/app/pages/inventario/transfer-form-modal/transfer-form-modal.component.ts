import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BranchTransferService } from '../../../services/inventory/branch-transfer.service';
import { BranchInventoryService } from '../../../services/inventory/branch-inventory.service';
import { ProductService } from '../../../services/inventory/product.service';
import { SucursalesService } from '../../../services/sucursales.service';
import { UsersService } from '../../../services/users.service';

@Component({
  selector: 'app-transfer-form-modal',
  templateUrl: './transfer-form-modal.component.html',
  styleUrls: ['./transfer-form-modal.component.css']
})
export class TransferFormModalComponent implements OnInit {
  form: FormGroup;
  branches: any[] = [];
  products: any[] = [];
  availableStock: { [key: number]: number } = {};
  loading: boolean = false;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<TransferFormModalComponent>,
    private transferService: BranchTransferService,
    private branchInventoryService: BranchInventoryService,
    private productService: ProductService,
    private sucursalesService: SucursalesService,
    private usersService: UsersService,
    private snackBar: MatSnackBar
  ) {
    this.form = this.fb.group({
      from_branch_id: [null, Validators.required],
      to_branch_id: [null, Validators.required],
      notes: [''],
      items: this.fb.array([], Validators.minLength(1))
    });
  }

  ngOnInit(): void {
    this.loadBranches();
    this.loadProducts();
    this.addItem(); // Agregar primer item por defecto
  }

  get items(): FormArray {
    return this.form.get('items') as FormArray;
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

  onFromBranchChange(): void {
    const fromBranchId = this.form.get('from_branch_id')?.value;
    if (fromBranchId) {
      this.loadAvailableStock(fromBranchId);
    }
  }

  loadAvailableStock(branchId: number): void {
    this.branchInventoryService.getInventoryByBranch(branchId).subscribe({
      next: (inventory) => {
        this.availableStock = {};
        inventory.forEach(item => {
          this.availableStock[item.product_id] = item.quantity;
        });
      },
      error: (error) => {
        console.error('Error al cargar stock disponible:', error);
      }
    });
  }

  createItemFormGroup(): FormGroup {
    return this.fb.group({
      product_id: [null, Validators.required],
      quantity: [1, [Validators.required, Validators.min(1)]],
      cost: [0, [Validators.required, Validators.min(0)]],
      notes: ['']
    });
  }

  addItem(): void {
    this.items.push(this.createItemFormGroup());
  }

  removeItem(index: number): void {
    if (this.items.length > 1) {
      this.items.removeAt(index);
    } else {
      this.snackBar.open('Debe haber al menos un producto', 'Cerrar', { duration: 3000 });
    }
  }

  onProductChange(index: number): void {
    const item = this.items.at(index);
    const productId = item.get('product_id')?.value;
    
    if (productId) {
      const product = this.products.find(p => p.id === productId);
      if (product) {
        item.patchValue({ cost: product.unitPrice || 0 });
      }
    }
  }

  getAvailableStock(productId: number): number {
    return this.availableStock[productId] || 0;
  }

  hasInsufficientStock(index: number): boolean {
    const item = this.items.at(index);
    const productId = item.get('product_id')?.value;
    const quantity = item.get('quantity')?.value;
    
    if (!productId || !quantity) return false;
    
    const available = this.getAvailableStock(productId);
    return quantity > available;
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.snackBar.open('Por favor completa todos los campos requeridos', 'Cerrar', { duration: 3000 });
      return;
    }

    const fromBranchId = this.form.get('from_branch_id')?.value;
    const toBranchId = this.form.get('to_branch_id')?.value;

    if (fromBranchId === toBranchId) {
      this.snackBar.open('La sucursal origen y destino deben ser diferentes', 'Cerrar', { duration: 3000 });
      return;
    }

    // Validar stock insuficiente
    for (let i = 0; i < this.items.length; i++) {
      if (this.hasInsufficientStock(i)) {
        this.snackBar.open('Hay productos con stock insuficiente', 'Cerrar', { duration: 3000 });
        return;
      }
    }

    this.loading = true;

    const idToken = localStorage.getItem('idToken');
    if (!idToken) {
      this.snackBar.open('No se encontró token de autenticación', 'Cerrar', { duration: 3000 });
      this.loading = false;
      return;
    }

    this.usersService.getUserByToken(idToken).subscribe({
      next: (user) => {
        const payload = {
          ...this.form.value,
          userId: user.id
        };

        this.transferService.createTransfer(payload).subscribe({
          next: (response) => {
            this.snackBar.open(
              `Transferencia ${response.transfer_number} creada correctamente`, 
              'Cerrar', 
              { duration: 3000 }
            );
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
      },
      error: (error) => {
        console.error('Error al obtener usuario:', error);
        this.loading = false;
      }
    });
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }

  getProductName(productId: number): string {
    const product = this.products.find(p => p.id === productId);
    return product ? `${product.code} - ${product.name}` : '';
  }

  getTotalItems(): number {
    return this.items.value.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);
  }

  getTotalValue(): number {
    return this.items.value.reduce((sum: number, item: any) => {
      return sum + ((item.quantity || 0) * (item.cost || 0));
    }, 0);
  }
}