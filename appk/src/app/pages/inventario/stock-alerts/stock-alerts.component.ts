import { Component, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BranchInventoryService, BranchInventoryWithDetails } from '../../../services/inventory/branch-inventory.service';
import { SucursalesService } from '../../../services/sucursales.service';

@Component({
  selector: 'app-stock-alerts',
  templateUrl: './stock-alerts.component.html',
  styleUrls: ['./stock-alerts.component.css']
})
export class StockAlertsComponent implements OnInit {
  criticalItems: BranchInventoryWithDetails[] = [];
  lowItems: BranchInventoryWithDetails[] = [];
  outItems: BranchInventoryWithDetails[] = [];
  branches: any[] = [];
  selectedBranchId: number | null = null;
  loading: boolean = false;

  displayedColumns: string[] = [
    'product_code',
    'product_name',
    'branch_alias',
    'quantity',
    'min_stock',
    'stock_status'
  ];

  constructor(
    private branchInventoryService: BranchInventoryService,
    private sucursalesService: SucursalesService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadBranches();
    this.loadAlerts();
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

  loadAlerts(): void {
    this.loading = true;

    // Cargar items críticos
    this.branchInventoryService.getCriticalStockItems(this.selectedBranchId || undefined).subscribe({
      next: (items) => {
        this.criticalItems = items;
      },
      error: (error) => {
        console.error('Error al cargar items críticos:', error);
      }
    });

    // Cargar items con stock bajo
    this.branchInventoryService.getLowStockItems(this.selectedBranchId || undefined).subscribe({
      next: (items) => {
        this.lowItems = items;
      },
      error: (error) => {
        console.error('Error al cargar items bajos:', error);
      }
    });

    // Cargar items agotados
    this.branchInventoryService.getOutOfStockItems(this.selectedBranchId || undefined).subscribe({
      next: (items) => {
        this.outItems = items;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error al cargar items agotados:', error);
        this.loading = false;
      }
    });
  }

  onBranchChange(): void {
    this.loadAlerts();
  }

  getTotalAlerts(): number {
    return this.criticalItems.length + this.lowItems.length + this.outItems.length;
  }

  getStockStatusColor(status: string): string {
    switch (status) {
      case 'critical': return 'warn';
      case 'low': return 'accent';
      case 'out': return 'warn';
      default: return '';
    }
  }

  getStockStatusLabel(status: string): string {
    switch (status) {
      case 'critical': return 'Crítico';
      case 'low': return 'Bajo';
      case 'out': return 'Agotado';
      default: return status;
    }
  }
}