import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
    selector: 'app-send-purchase-order-dialog',
    template: `
    <h2 mat-dialog-title>Enviar Orden de Compra por Email</h2>
    
    <mat-dialog-content>
      <form [formGroup]="emailForm">
        <mat-form-field appearance="outline" style="width: 100%; margin-bottom: 16px;">
          <mat-label>Email del proveedor</mat-label>
          <input matInput formControlName="recipientEmail" placeholder="proveedor@ejemplo.com" type="email">
          <mat-icon matSuffix>email</mat-icon>
          <mat-error *ngIf="emailForm.get('recipientEmail')?.hasError('required')">
            El email es requerido
          </mat-error>
          <mat-error *ngIf="emailForm.get('recipientEmail')?.hasError('email')">
            Email inválido
          </mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" style="width: 100%; margin-bottom: 16px;">
          <mat-label>Mensaje personalizado (opcional)</mat-label>
          <textarea matInput formControlName="customMessage" rows="3" 
            placeholder="Mensaje adicional para el proveedor"></textarea>
        </mat-form-field>

        <div class="email-preview" style="margin-top: 16px; padding: 12px; background: #f5f5f5; border-radius: 4px;">
          <p style="margin: 0 0 8px 0; font-weight: 500;">Vista previa:</p>
          <p style="margin: 0; font-size: 14px; color: #666;">
            <strong>Para:</strong> {{emailForm.get('recipientEmail')?.value || 'No especificado'}}<br>
            <strong>Orden:</strong> {{data.orderNumber}}<br>
            <strong>Proveedor:</strong> {{data.supplierName}}<br>
            <strong>Total:</strong> {{data.total | currency:data.currency}}<br>
            <strong>Fecha Esperada:</strong> {{data.expectedDate | date:'dd/MM/yyyy'}}
          </p>
        </div>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancelar</button>
      <button mat-raised-button color="primary" 
        (click)="onSend()" 
        [disabled]="!emailForm.valid || sending">
        <mat-icon *ngIf="!sending">send</mat-icon>
        <mat-spinner *ngIf="sending" diameter="20" style="display: inline-block; margin-right: 8px;"></mat-spinner>
        {{sending ? 'Enviando...' : 'Enviar Orden'}}
      </button>
    </mat-dialog-actions>
  `,
    styles: [`
    mat-dialog-content {
      min-width: 400px;
      max-width: 500px;
    }

    .email-preview {
      font-size: 13px;
    }
  `],
    standalone: false
})
export class SendPurchaseOrderDialogComponent {
  emailForm: FormGroup;
  sending = false;

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<SendPurchaseOrderDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { 
      orderId: number;
      orderNumber: string;
      supplierName: string;
      total: number;
      currency: string;
      expectedDate: string;
      defaultEmail?: string;
    }
  ) {
    this.emailForm = this.fb.group({
      recipientEmail: [data.defaultEmail || '', [Validators.required, Validators.email]],
      customMessage: ['Le enviamos nuestra orden de compra. Por favor, confirme la recepción.']
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSend(): void {
    if (this.emailForm.valid) {
      this.sending = true;
      this.dialogRef.close(this.emailForm.value);
    }
  }
}