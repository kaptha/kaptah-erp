import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
    selector: 'app-send-order-dialog',
  template: `
    <h2 mat-dialog-title class="order-header">Confirmar Envío de Orden</h2>
    
    <mat-dialog-content class="scrollable-content">
      <form [formGroup]="emailForm" class="order-form">
        
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Email del cliente</mat-label>
          <input matInput formControlName="recipientEmail" placeholder="cliente@ejemplo.com" type="email">
          <mat-icon matSuffix>contact_mail</mat-icon>
          <mat-error *ngIf="emailForm.get('recipientEmail')?.hasError('required')">
            El email es obligatorio
          </mat-error>
          <mat-error *ngIf="emailForm.get('recipientEmail')?.hasError('email')">
            Formato de email incorrecto
          </mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Mensaje personalizado</mat-label>
          <textarea matInput formControlName="customMessage" rows="3" 
            placeholder="Escribe una nota de agradecimiento..."></textarea>
        </mat-form-field>

        <div class="order-summary-card">
          <div class="summary-row main-data">
            <span class="order-id">Orden #{{data.orderId.substring(0, 8)}}</span>
            <span class="order-total">{{data.total | currency}}</span>
          </div>
          
          <div class="summary-divider"></div>
          
          <div class="summary-row detail-data">
            <mat-icon>person</mat-icon>
            <span>{{data.customerName}}</span>
          </div>
          
          <div class="summary-row detail-data">
            <mat-icon>alternate_email</mat-icon>
            <span class="truncate">{{emailForm.get('recipientEmail')?.value || 'Sin email'}}</span>
          </div>
        </div>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end" class="order-actions">
      <button mat-button (click)="onCancel()" [disabled]="sending">Cancelar</button>
      <button mat-raised-button color="accent" 
        (click)="onSend()" 
        [disabled]="!emailForm.valid || sending"
        class="confirm-button">
        <mat-icon *ngIf="!sending">shopping_bag</mat-icon>
        <mat-spinner *ngIf="sending" diameter="20"></mat-spinner>
        <span>{{sending ? 'Procesando...' : 'Enviar Orden'}}</span>
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .scrollable-content {
      min-width: 280px;
      max-width: 450px; /* Un poco más estrecho para parecer un ticket */
    }

    .order-form {
      display: flex;
      flex-direction: column;
      padding-top: 8px;
    }

    .full-width {
      width: 100%;
      margin-bottom: 4px;
    }

    /* Estilo tipo Ticket/Resumen */
    .order-summary-card {
      background-color: #fff;
      border: 2px solid #f0f0f0;
      border-radius: 12px;
      padding: 16px;
      margin-top: 12px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    }

    .summary-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    .main-data {
      margin-bottom: 12px;
    }

    .order-id {
      font-weight: 700;
      color: #1a1a1a;
      font-size: 1rem;
    }

    .order-total {
      font-size: 1.2rem;
      font-weight: 800;
      color: #2e7d32; /* Verde éxito para el dinero */
    }

    .summary-divider {
      height: 1px;
      background: #eee;
      margin-bottom: 12px;
    }

    .detail-data {
      justify-content: flex-start;
      gap: 10px;
      color: #666;
      font-size: 0.85rem;
    }

    .detail-data mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      color: #999;
    }

    .truncate {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* Spinner */
    mat-spinner {
      display: inline-block;
      margin-right: 8px;
    }

    /* Responsividad */
    @media (min-width: 600px) {
      .scrollable-content {
        width: 420px;
      }
    }

    @media (max-width: 450px) {
      .order-actions {
        flex-direction: column-reverse;
        padding: 16px !important;
        gap: 8px;
      }

      .order-actions button {
        width: 100%;
        margin: 0 !important;
      }

      .order-total {
        font-size: 1.1rem;
      }
    }
  `],
    standalone: false
})
export class SendOrderDialogComponent {
  emailForm: FormGroup;
  sending = false;

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<SendOrderDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { 
      orderId: string;
      customerName: string;
      total: number;
      defaultEmail?: string;
    }
  ) {
    this.emailForm = this.fb.group({
      recipientEmail: [data.defaultEmail || '', [Validators.required, Validators.email]],
      customMessage: ['Gracias por su compra. Adjuntamos la confirmación de su orden.']
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