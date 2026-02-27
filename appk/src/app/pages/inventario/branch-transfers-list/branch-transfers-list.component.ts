import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BranchTransferService, BranchTransfer, TransferStatus } from '../../../services/inventory/branch-transfer.service';
import { SucursalesService } from '../../../services/sucursales.service';
import { TransferFormModalComponent } from '../transfer-form-modal/transfer-form-modal.component';
import { TransferDetailModalComponent } from '../transfer-detail-modal/transfer-detail-modal.component';

@Component({
  selector: 'app-branch-transfers-list',
  templateUrl: './branch-transfers-list.component.html',
  styleUrls: ['./branch-transfers-list.component.css']
})
export class BranchTransfersListComponent implements OnInit {
  transfers: BranchTransfer[] = [];
  branches: any[] = [];
  selectedStatus: string = 'all';
  selectedBranchId: number | null = null;
  loading: boolean = false;

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
    { value: 'pending', label: 'Pendiente' },
    { value: 'in_transit', label: 'En Tránsito' },
    { value: 'completed', label: 'Completada' },
    { value: 'cancelled', label: 'Cancelada' }
  ];

  constructor(
    private transferService: BranchTransferService,
    private sucursalesService: SucursalesService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadBranches();
    this.loadTransfers();
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

  loadTransfers(): void {
    this.loading = true;
    const filters: any = {};

    if (this.selectedStatus !== 'all') {
      filters.status = this.selectedStatus as TransferStatus;
    }

    if (this.selectedBranchId) {
      filters.from_branch_id = this.selectedBranchId;
    }

    this.transferService.getTransfers(filters).subscribe({
      next: (transfers) => {
        this.transfers = transfers;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error al cargar transferencias:', error);
        this.snackBar.open('Error al cargar transferencias', 'Cerrar', { duration: 3000 });
        this.loading = false;
      }
    });
  }

  onStatusChange(): void {
    this.loadTransfers();
  }

  onBranchChange(): void {
    this.loadTransfers();
  }

  openCreateModal(): void {
    const dialogRef = this.dialog.open(TransferFormModalComponent, {
      width: '800px',
      maxHeight: '90vh'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadTransfers();
      }
    });
  }

  openDetailModal(transfer: BranchTransfer): void {
    const dialogRef = this.dialog.open(TransferDetailModalComponent, {
      width: '900px',
      maxHeight: '90vh',
      data: { transferId: transfer.id }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadTransfers();
      }
    });
  }

  approveTransfer(transfer: BranchTransfer): void {
    if (confirm(`¿Aprobar transferencia ${transfer.transfer_number}?`)) {
      const idToken = localStorage.getItem('idToken');
      this.transferService.approveTransfer(transfer.id, idToken!).subscribe({
        next: () => {
          this.snackBar.open('Transferencia aprobada', 'Cerrar', { duration: 3000 });
          this.loadTransfers();
        },
        error: (error) => {
          console.error('Error al aprobar:', error);
          this.snackBar.open('Error al aprobar transferencia', 'Cerrar', { duration: 3000 });
        }
      });
    }
  }

  completeTransfer(transfer: BranchTransfer): void {
    if (confirm(`¿Completar transferencia ${transfer.transfer_number}? Esto actualizará el inventario.`)) {
      this.transferService.completeTransfer(transfer.id).subscribe({
        next: () => {
          this.snackBar.open('Transferencia completada exitosamente', 'Cerrar', { duration: 3000 });
          this.loadTransfers();
        },
        error: (error) => {
          console.error('Error al completar:', error);
          this.snackBar.open(
            error.error?.message || 'Error al completar transferencia',
            'Cerrar',
            { duration: 5000 }
          );
        }
      });
    }
  }

  cancelTransfer(transfer: BranchTransfer): void {
    const reason = prompt('Razón de la cancelación:');
    if (reason !== null) {
      this.transferService.cancelTransfer(transfer.id, reason).subscribe({
        next: () => {
          this.snackBar.open('Transferencia cancelada', 'Cerrar', { duration: 3000 });
          this.loadTransfers();
        },
        error: (error) => {
          console.error('Error al cancelar:', error);
          this.snackBar.open('Error al cancelar transferencia', 'Cerrar', { duration: 3000 });
        }
      });
    }
  }

  deleteTransfer(transfer: BranchTransfer): void {
    if (confirm(`¿Eliminar transferencia ${transfer.transfer_number}?`)) {
      this.transferService.deleteTransfer(transfer.id).subscribe({
        next: () => {
          this.snackBar.open('Transferencia eliminada', 'Cerrar', { duration: 3000 });
          this.loadTransfers();
        },
        error: (error) => {
          console.error('Error al eliminar:', error);
          this.snackBar.open('Error al eliminar transferencia', 'Cerrar', { duration: 3000 });
        }
      });
    }
  }

  getBranchName(branchId: number): string {
    const branch = this.branches.find(b => b.id === branchId);
    return branch ? branch.alias : `Sucursal ${branchId}`;
  }

  getStatusColor(status: TransferStatus): string {
    switch (status) {
      case 'pending': return 'accent';
      case 'in_transit': return 'primary';
      case 'completed': return 'primary';
      case 'cancelled': return 'warn';
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

  canApprove(transfer: BranchTransfer): boolean {
    return transfer.status === 'pending';
  }

  canComplete(transfer: BranchTransfer): boolean {
    return transfer.status === 'in_transit';
  }

  canCancel(transfer: BranchTransfer): boolean {
    return transfer.status === 'pending' || transfer.status === 'in_transit';
  }

  canDelete(transfer: BranchTransfer): boolean {
    return transfer.status !== 'completed';
  }
}
