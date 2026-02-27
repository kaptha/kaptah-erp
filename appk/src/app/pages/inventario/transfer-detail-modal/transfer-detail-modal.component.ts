import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { BranchTransferService, BranchTransferWithItems } from '../../../services/inventory/branch-transfer.service';

@Component({
  selector: 'app-transfer-detail-modal',
  templateUrl: './transfer-detail-modal.component.html',
  styleUrls: ['./transfer-detail-modal.component.css']
})
export class TransferDetailModalComponent implements OnInit {
  transfer: BranchTransferWithItems | null = null;
  loading: boolean = false;

  displayedColumns: string[] = [
    'product_code',
    'product_name',
    'quantity',
    'cost',
    'total',
    'notes'
  ];

  constructor(
    private dialogRef: MatDialogRef<TransferDetailModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private transferService: BranchTransferService
  ) {}

  ngOnInit(): void {
    this.loadTransfer();
  }

  loadTransfer(): void {
    this.loading = true;
    this.transferService.getTransfer(this.data.transferId).subscribe({
      next: (transfer) => {
        this.transfer = transfer;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error al cargar transferencia:', error);
        this.loading = false;
      }
    });
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'pending': return 'accent';
      case 'in_transit': return 'primary';
      case 'completed': return 'primary';
      case 'cancelled': return 'warn';
      default: return '';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'pending': return 'Pendiente';
      case 'in_transit': return 'En Tránsito';
      case 'completed': return 'Completada';
      case 'cancelled': return 'Cancelada';
      default: return status;
    }
  }

  onClose(): void {
    this.dialogRef.close();
  }
}