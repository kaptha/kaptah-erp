import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
    selector: 'app-send-delivery-dialog',
  template: `
    <h2 mat-dialog-title class="dialog-title">Enviar Guía de Remisión</h2>
    
    <mat-dialog-content class="responsive-container">
      <form [formGroup]="emailForm" class="form-layout">
        
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Email del cliente</mat-label>
          <input matInput formControlName="recipientEmail" placeholder="cliente@ejemplo.com" type="email">
          <mat-icon matSuffix>email</mat-icon>
          <mat-error *ngIf="emailForm.get('recipientEmail')?.hasError('required')">
            El email es requerido
          </mat-error>
          <mat-error *ngIf="emailForm.get('recipientEmail')?.hasError('email')">
            Email inválido
          </mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Mensaje personalizado (opcional)</mat-label>
          <textarea matInput formControlName="customMessage" rows="3" 
            placeholder="Instrucciones de entrega..."></textarea>
        </mat-form-field>

        <div class="preview-box">
          <div class="preview-header">
            <mat-icon>visibility</mat-icon>
            <span>Vista previa del envío</span>
          </div>
          
          <div class="preview-grid">
            <div class="grid-item">
              <span class="label">Destinatario:</span>
              <span class="value">{{emailForm.get('recipientEmail')?.value || '---'}}</span>
            </div>
            <div class="grid-item">
              <span class="label">Guía:</span>
              <span class="value">#{{data.deliveryNoteId.substring(0, 8)}}</span>
            </div>
            <div class="grid-item">
              <span class="label">Orden:</span>
              <span class="value">#{{data.salesOrderId.substring(0, 8)}}</span>
            </div>
            <div class="grid-item">
              <span class="label">Fecha Entrega:</span>
              <span class="value">{{data.deliveryDate | date:'dd/MM/yyyy'}}</span>
            </div>
          </div>
        </div>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end" class="actions-group">
      <button mat-button (click)="onCancel()" [disabled]="sending">Cancelar</button>
      <button mat-raised-button color="primary" 
        (click)="onSend()" 
        [disabled]="!emailForm.valid || sending"
        class="send-btn">
        <mat-icon *ngIf="!sending">local_shipping</mat-icon>
        <mat-spinner *ngIf="sending" diameter="20"></mat-spinner>
        <span>{{sending ? 'Enviando...' : 'Enviar Guía'}}</span>
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .responsive-container {
      min-width: 280px;
      max-width: 500px;
    }

    .form-layout {
      display: flex;
      flex-direction: column;
      padding-top: 12px;
    }

    .full-width {
      width: 100%;
      margin-bottom: 4px;
    }

    /* Caja de Vista Previa mejorada */
    .preview-box {
      background: #fafafa;
      border: 1px dashed #ccc;
      border-radius: 8px;
      padding: 16px;
      margin-top: 8px;
    }

    .preview-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
      color: #555;
      font-weight: 500;
      font-size: 0.9rem;
    }

    .preview-header mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .preview-grid {
      display: grid;
      grid-template-columns: 1fr; /* Una columna en móvil */
      gap: 10px;
    }

    .grid-item {
      display: flex;
      flex-direction: column;
    }

    .label {
      font-size: 11px;
      color: #888;
      text-transform: uppercase;
      font-weight: 600;
    }

    .value {
      font-size: 13px;
      color: #333;
      word-break: break-all;
    }

    mat-spinner {
      display: inline-block;
      margin-right: 8px;
    }

    /* Media Queries */
    @media (min-width: 480px) {
      .preview-grid {
        grid-template-columns: 1fr 1fr; /* Dos columnas en tablets/PC */
      }
      .responsive-container {
        width: 480px;
      }
    }

    @media (max-width: 400px) {
      .actions-group {
        flex-direction: column-reverse;
        padding: 16px !important;
        gap: 8px;
      }
      .actions-group button {
        width: 100%;
        margin: 0 !important;
      }
      .dialog-title {
        font-size: 1.1rem;
      }
    }
  `],
    standalone: false
})
export class SendDeliveryDialogComponent {
  emailForm: FormGroup;
  sending = false;

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<SendDeliveryDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { 
      deliveryNoteId: string;
      salesOrderId: string;
      deliveryDate: string;
      defaultEmail?: string;
    }
  ) {
    this.emailForm = this.fb.group({
      recipientEmail: [data.defaultEmail || '', [Validators.required, Validators.email]],
      customMessage: ['Adjuntamos la guía de remisión de su pedido. Por favor, tenga a la mano su identificación para recibir.']
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