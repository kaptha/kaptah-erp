import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BranchInventoryService, BranchInventoryWithDetails } from '../../../services/inventory/branch-inventory.service';
import { SucursalesService } from '../../../services/sucursales.service';
import { BranchInventoryModalComponent } from '../branch-inventory-modal/branch-inventory-modal.component';

@Component({
  selector: 'app-branch-inventory-list',
  templateUrl: './branch-inventory-list.component.html',
  styleUrls: ['./branch-inventory-list.component.css']
})
export class BranchInventoryListComponent implements OnInit {
  inventoryItems: BranchInventoryWithDetails[] = [];
  filteredItems: BranchInventoryWithDetails[] = [];
  branches: any[] = [];
  selectedBranchId: number | null = null;
  selectedStockStatus: string = 'all';
  searchTerm: string = '';
  loading: boolean = false;
  totalValue: number = 0;

  displayedColumns: string[] = [
    'product_code',
    'product_name',
    'branch_alias',
    'quantity',
    'min_stock',
    'cost',
    'total_value',
    'stock_status',
    'actions'
  ];

  stockStatuses = [
    { value: 'all', label: 'Todos' },
    { value: 'ok', label: 'Stock OK' },
    { value: 'low', label: 'Stock Bajo' },
    { value: 'critical', label: 'Stock Crítico' },
    { value: 'out', label: 'Agotado' }
  ];

  constructor(
    private branchInventoryService: BranchInventoryService,
    private sucursalesService: SucursalesService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadBranches();
    this.loadInventory();
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

  loadInventory(): void {
    this.loading = true;
    const filters: any = {};
    
    if (this.selectedBranchId) {
      filters.branch_id = this.selectedBranchId;
    }
    
    if (this.selectedStockStatus !== 'all') {
      filters.stock_status = this.selectedStockStatus;
    }

    if (this.searchTerm) {
      filters.search = this.searchTerm;
    }

    this.branchInventoryService.getInventory(filters).subscribe({
      next: (items) => {
        this.inventoryItems = items;
        this.filteredItems = items;
        this.calculateTotalValue();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error al cargar inventario:', error);
        this.snackBar.open('Error al cargar inventario', 'Cerrar', { duration: 3000 });
        this.loading = false;
      }
    });
  }

  calculateTotalValue(): void {
    this.totalValue = this.filteredItems.reduce((sum, item) => sum + item.total_value, 0);
  }

  onBranchChange(): void {
    this.loadInventory();
  }

  onStockStatusChange(): void {
    this.loadInventory();
  }

  onSearch(): void {
    this.loadInventory();
  }

  openAddModal(): void {
    const dialogRef = this.dialog.open(BranchInventoryModalComponent, {
      width: '600px',
      data: { mode: 'create' }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadInventory();
      }
    });
  }

  openEditModal(item: BranchInventoryWithDetails): void {
    const dialogRef = this.dialog.open(BranchInventoryModalComponent, {
      width: '600px',
      data: { mode: 'edit', item }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadInventory();
      }
    });
  }

  deleteItem(item: BranchInventoryWithDetails): void {
    if (confirm(`¿Estás seguro de eliminar el inventario de ${item.product_name} en ${item.branch_alias}?`)) {
      this.branchInventoryService.deleteInventory(item.id).subscribe({
        next: () => {
          this.snackBar.open('Inventario eliminado correctamente', 'Cerrar', { duration: 3000 });
          this.loadInventory();
        },
        error: (error) => {
          console.error('Error al eliminar:', error);
          this.snackBar.open('Error al eliminar inventario', 'Cerrar', { duration: 3000 });
        }
      });
    }
  }

  getStockStatusColor(status: string): string {
    switch (status) {
      case 'ok': return 'primary';
      case 'low': return 'accent';
      case 'critical': return 'warn';
      case 'out': return 'warn';
      default: return '';
    }
  }

  getStockStatusLabel(status: string): string {
    switch (status) {
      case 'ok': return 'OK';
      case 'low': return 'Bajo';
      case 'critical': return 'Crítico';
      case 'out': return 'Agotado';
      default: return status;
    }
  }
}
