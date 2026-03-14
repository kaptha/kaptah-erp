import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatMenuModule } from '@angular/material/menu';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { BranchInventoryService, BranchInventoryWithDetails } from '../../../services/inventory/branch-inventory.service';
import { BranchInventoryModalComponent } from '../branch-inventory-modal/branch-inventory-modal.component';
import { SucursalesService } from '../../../services/sucursales.service';

@Component({
  selector: 'app-branch-inventory-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
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
    MatChipsModule,
    MatTooltipModule
  ],
  templateUrl: './branch-inventory-list.component.html',
  styleUrls: ['./branch-inventory-list.component.css']
})
export class BranchInventoryListComponent implements OnInit, OnDestroy {
  inventoryItems: BranchInventoryWithDetails[] = [];
  filteredItems: BranchInventoryWithDetails[] = [];
  branches: any[] = [];
  selectedBranchId: number | null = null;
  selectedStockStatus: string = 'all';
  searchTerm: string = '';
  loading: boolean = false;
  totalValue: number = 0;
  isMobile = false;
  mobilePaginator = { pageIndex: 0, pageSize: 5 };

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

  private resizeListener = () => this.checkScreenSize();

  constructor(
    private branchInventoryService: BranchInventoryService,
    private sucursalesService: SucursalesService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadBranches();
    this.loadInventory();
    this.checkScreenSize();
    window.addEventListener('resize', this.resizeListener);
  }

  ngOnDestroy(): void {
    window.removeEventListener('resize', this.resizeListener);
  }

  private checkScreenSize(): void {
    this.isMobile = window.innerWidth <= 600;
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
        this.mobilePaginator.pageIndex = 0;
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
      case 'critical': return 'Cr\u00edtico';
      case 'out': return 'Agotado';
      default: return status;
    }
  }

  getCriticalCount(): number {
    return this.filteredItems.filter(item =>
      item.stock_status === 'critical' || item.stock_status === 'out'
    ).length;
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
    const message = 'Eliminar inventario de ' + item.product_name + ' en ' + item.branch_alias + '?';
    if (confirm(message)) {
      this.branchInventoryService.deleteInventory(item.id).subscribe({
        next: () => {
          this.snackBar.open('Inventario eliminado', 'Cerrar', { duration: 3000 });
          this.loadInventory();
        },
        error: (error) => {
          console.error('Error:', error);
          this.snackBar.open('Error al eliminar', 'Cerrar', { duration: 3000 });
        }
      });
    }
  }

  getMobileStartIndex(): number {
    return this.mobilePaginator.pageIndex * this.mobilePaginator.pageSize;
  }

  getMobileEndIndex(): number {
    const end = this.getMobileStartIndex() + this.mobilePaginator.pageSize;
    return Math.min(end, this.filteredItems.length);
  }

  isLastMobilePage(): boolean {
    return this.getMobileEndIndex() >= this.filteredItems.length;
  }

  previousMobilePage(): void {
    if (this.mobilePaginator.pageIndex > 0) {
      this.mobilePaginator.pageIndex--;
    }
  }

  nextMobilePage(): void {
    if (!this.isLastMobilePage()) {
      this.mobilePaginator.pageIndex++;
    }
  }

  exportInventory(format: string): void {
    this.snackBar.open('Exportar como ' + format + ' - En desarrollo', 'Cerrar', { duration: 3000 });
  }
}
