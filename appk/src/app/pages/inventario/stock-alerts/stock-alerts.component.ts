import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { BranchInventoryService, BranchInventoryWithDetails } from '../../../services/inventory/branch-inventory.service';
import { SucursalesService } from '../../../services/sucursales.service';

@Component({
  selector: 'app-stock-alerts',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatTableModule,
    MatSelectModule,
    MatFormFieldModule,
    MatIconModule,
    MatSnackBarModule,
    MatProgressSpinnerModule
  ],
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
    this.branchInventoryService.getInventory({ 
      stock_status: 'critical',
      branch_id: this.selectedBranchId || undefined
    }).subscribe({
      next: (items) => {
        this.criticalItems = items;
      },
      error: (error) => {
        console.error('Error al cargar items críticos:', error);
      }
    });

    // Cargar items con stock bajo
    this.branchInventoryService.getInventory({ 
      stock_status: 'low',
      branch_id: this.selectedBranchId || undefined
    }).subscribe({
      next: (items) => {
        this.lowItems = items;
      },
      error: (error) => {
        console.error('Error al cargar items con stock bajo:', error);
      }
    });

    // Cargar items agotados
    this.branchInventoryService.getInventory({ 
      stock_status: 'out',
      branch_id: this.selectedBranchId || undefined
    }).subscribe({
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
}
}
