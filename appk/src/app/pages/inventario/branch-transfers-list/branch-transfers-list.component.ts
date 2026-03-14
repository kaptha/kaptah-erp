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
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatMenuModule } from '@angular/material/menu';
import { MatChipsModule } from '@angular/material/chips';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { BranchTransferService, BranchTransferWithItems, TransferStatus } from '../../../services/inventory/branch-transfer.service';
import { SucursalesService } from '../../../services/sucursales.service';
import { TransferFormModalComponent } from '../transfer-form-modal/transfer-form-modal.component';

@Component({
  selector: 'app-branch-transfers-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatTableModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatSelectModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatMenuModule,
    MatChipsModule,
    MatInputModule,
    MatTooltipModule
  ],
  templateUrl: './branch-transfers-list.component.html',
  styleUrls: ['./branch-transfers-list.component.css']
})
export class BranchTransfersListComponent implements OnInit, OnDestroy {
  transfers: BranchTransferWithItems[] = [];
  allTransfers: BranchTransferWithItems[] = [];
  branches: any[] = [];
  selectedStatus: string = 'all';
  selectedBranchId: number | null = null;
  loading: boolean = false;
  isMobile = false;
  mobilePaginator = { pageIndex: 0, pageSize: 5 };

  displayedColumns: string[] = [
    'transfer_number',
    'from_branch',
    'to_branch',
    'status',
    'requested_by',
    'created_at',
    'actions'
  ];

  statusOptions = [
    { value: 'all', label: 'Todos' },
    { value: 'pending', label: 'Pendientes' },
    { value: 'in_transit', label: 'En Tránsito' },
    { value: 'completed', label: 'Completadas' },
    { value: 'cancelled', label: 'Canceladas' }
  ];

  private resizeListener = () => this.checkScreenSize();

  constructor(
    private branchTransferService: BranchTransferService,
    private sucursalesService: SucursalesService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadBranches();
    this.loadTransfers();
    this.checkScreenSize();
    window.addEventListener('resize', this.resizeListener);
  }

  ngOnDestroy(): void {
    window.removeEventListener('resize', this.resizeListener);
  }

  private checkScreenSize(): void {
    this.isMobile = window.innerWidth <= 600;
  }

  // ===== CARGA DE DATOS =====

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

  loadTransfers(): void {
    this.loading = true;
    const filters: any = {};
    if (this.selectedBranchId) {
      filters.from_branch_id = this.selectedBranchId;
    }
    if (this.selectedStatus !== 'all') {
      filters.status = this.selectedStatus as TransferStatus;
    }
    this.branchTransferService.getTransfers(filters).subscribe({
      next: (transfers) => {
        this.allTransfers = transfers;
        this.transfers = [...transfers];
        this.mobilePaginator.pageIndex = 0;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error al cargar transferencias:', error);
        this.snackBar.open('Error al cargar transferencias', 'Cerrar', { duration: 3000 });
        this.loading = false;
      }
    });
  }

  // ===== FILTROS =====

  onStatusChange(): void {
    this.loadTransfers();
  }

  onBranchChange(): void {
    this.loadTransfers();
  }

  applyFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value.trim().toLowerCase();

    if (!filterValue) {
      this.transfers = [...this.allTransfers];
    } else {
      this.transfers = this.allTransfers.filter(t =>
        (t.transfer_number || '').toLowerCase().includes(filterValue) ||
        (t.from_branch_alias || '').toLowerCase().includes(filterValue) ||
        (t.to_branch_alias || '').toLowerCase().includes(filterValue) ||
        (t.requested_by || '').toLowerCase().includes(filterValue) ||
        (t.status || '').toLowerCase().includes(filterValue)
      );
    }

    this.mobilePaginator.pageIndex = 0;
  }

  // ===== PAGINACIÓN MÓVIL =====

  getMobileStartIndex(): number {
    return this.mobilePaginator.pageIndex * this.mobilePaginator.pageSize;
  }

  getMobileEndIndex(): number {
    const end = this.getMobileStartIndex() + this.mobilePaginator.pageSize;
    return Math.min(end, this.transfers.length);
  }

  isLastMobilePage(): boolean {
    return this.getMobileEndIndex() >= this.transfers.length;
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

  // ===== HELPERS =====

  getBranchName(branchId: number): string {
    const branch = this.branches.find(b => b.id === branchId);
    return branch?.alias || 'N/A';
  }

  // ===== ACCIONES =====

  openCreateModal(): void {
    const dialogRef = this.dialog.open(TransferFormModalComponent, {
      width: '800px',
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadTransfers();
      }
    });
  }

  openDetailModal(transfer: BranchTransferWithItems): void {
    this.snackBar.open('Modal de detalle - En desarrollo', 'Cerrar', { duration: 3000 });
  }

  viewDetails(transfer: BranchTransferWithItems): void {
    this.openDetailModal(transfer);
  }

  approveTransfer(transfer: BranchTransferWithItems): void {
    if (confirm(`¿Aprobar transferencia ${transfer.transfer_number}?`)) {
      const approvedBy = 'Usuario Actual';
      this.branchTransferService.approveTransfer(transfer.id, approvedBy).subscribe({
        next: () => {
          this.snackBar.open('Transferencia aprobada', 'Cerrar', { duration: 3000 });
          this.loadTransfers();
        },
        error: (error) => {
          console.error('Error:', error);
          this.snackBar.open('Error al aprobar transferencia', 'Cerrar', { duration: 3000 });
        }
      });
    }
  }

  completeTransfer(transfer: BranchTransferWithItems): void {
    if (confirm(`¿Completar transferencia ${transfer.transfer_number}? Esto actualizará el inventario.`)) {
      this.branchTransferService.completeTransfer(transfer.id).subscribe({
        next: () => {
          this.snackBar.open('Transferencia completada e inventario actualizado', 'Cerrar', { duration: 3000 });
          this.loadTransfers();
        },
        error: (error) => {
          console.error('Error:', error);
          this.snackBar.open('Error al completar transferencia', 'Cerrar', { duration: 3000 });
        }
      });
    }
  }

  cancelTransfer(transfer: BranchTransferWithItems): void {
    const reason = prompt(`Cancelar transferencia ${transfer.transfer_number}. Ingresa el motivo:`);
    if (reason) {
      this.branchTransferService.cancelTransfer(transfer.id, reason).subscribe({
        next: () => {
          this.snackBar.open('Transferencia cancelada', 'Cerrar', { duration: 3000 });
          this.loadTransfers();
        },
        error: (error) => {
          console.error('Error:', error);
          this.snackBar.open('Error al cancelar transferencia', 'Cerrar', { duration: 3000 });
        }
      });
    }
  }

  deleteTransfer(transfer: BranchTransferWithItems): void {
    if (confirm(`¿Eliminar transferencia ${transfer.transfer_number}?`)) {
      this.branchTransferService.deleteTransfer(transfer.id).subscribe({
        next: () => {
          this.snackBar.open('Transferencia eliminada', 'Cerrar', { duration: 3000 });
          this.loadTransfers();
        },
        error: (error) => {
          console.error('Error:', error);
          this.snackBar.open('Error al eliminar transferencia', 'Cerrar', { duration: 3000 });
        }
      });
    }
  }

  // ===== ESTADO =====

  canApprove(transfer: BranchTransferWithItems): boolean {
    return transfer.status === 'pending';
  }

  canComplete(transfer: BranchTransferWithItems): boolean {
    return transfer.status === 'in_transit' || transfer.status === 'pending';
  }

  canCancel(transfer: BranchTransferWithItems): boolean {
    return transfer.status === 'pending' || transfer.status === 'in_transit';
  }

  canDelete(transfer: BranchTransferWithItems): boolean {
    return transfer.status === 'cancelled';
  }

  getStatusColor(status: TransferStatus): string {
    switch (status) {
      case 'pending': return 'warn';
      case 'in_transit': return 'accent';
      case 'completed': return 'primary';
      case 'cancelled': return '';
      default: return '';
    }
  }

  getStatusLabel(status: TransferStatus): string {
    switch (status) {
      case 'pending': return 'Pendiente';
      case 'in_transit': return 'En Tránsito';
      case 'completed': return 'Completada';
      case 'cancelled': return 'Cancelada';
      default: return status;
    }
  }

  getPendingCount(): number {
    return this.transfers.filter(t => t.status === 'pending').length;
  }

  getInTransitCount(): number {
    return this.transfers.filter(t => t.status === 'in_transit').length;
  }

  getCompletedCount(): number {
    return this.transfers.filter(t => t.status === 'completed').length;
  }

  exportTransfers(format: string): void {
    this.snackBar.open('Exportar como ' + format + ' - En desarrollo', 'Cerrar', { duration: 3000 });
  }
}