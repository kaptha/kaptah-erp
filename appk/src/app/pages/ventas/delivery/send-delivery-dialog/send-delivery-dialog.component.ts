import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
    selector: 'app-send-delivery-dialog',
  template: `
    <h2 mat-dialog-title class="dialog-title">Enviar Guia de Remision</h2>
    
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
            Email invalido
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
            <span>Vista previa del envio</span>
          </div>
          
          <div class="preview-grid">
            <div class="grid-item">
              <span class="label">Destinatario:</span>
              <span class="value">{{emailForm.get('recipientEmail')?.value || '---'}}</span>
            </div>
            <div class="grid-item">
              <span class="label">Guia:</span>
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
      <button mat-raised-button class="btn-primary" 
        (click)="onSend()" 
        [disabled]="!emailForm.valid || sending"
        class="send-btn">
        <mat-icon *ngIf="!sending">local_shipping</mat-icon>
        <mat-spinner *ngIf="sending" diameter="20"></mat-spinner>
        <span>{{sending ? 'Enviando...' : 'Enviar Guia'}}</span>
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    :host {
      display: block;
    }

    .responsive-container {
      min-width: 0;
      max-width: 500px;
      padding: 0 24px;
      overflow-x: hidden;
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
      min-width: 18px;
    }

    .preview-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 10px;
    }

    .grid-item {
      display: flex;
      flex-direction: column;
      min-width: 0;
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
      word-break: break-word;
      overflow-wrap: break-word;
    }

    mat-spinner {
      display: inline-block;
      margin-right: 8px;
    }

    .actions-group {
      padding: 12px 24px 16px;
      gap: 8px;
    }

    @media (min-width: 480px) {
      .preview-grid {
        grid-template-columns: 1fr 1fr;
      }
      .responsive-container {
        width: 480px;
      }
    }

    @media (max-width: 480px) {
      .responsive-container {
        padding: 0 16px;
      }

      .actions-group {
        flex-direction: column-reverse;
        padding: 12px 16px 16px;
        gap: 8px;
      }

      .actions-group button {
        width: 100%;
        margin: 0 !important;
      }

      .dialog-title {
        font-size: 1.1rem;
      }

      .preview-box {
        padding: 12px;
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
    const isMobile = window.innerWidth < 480;
    this.dialogRef.updateSize(
      isMobile ? '95vw' : '480px',
      'auto'
    );

    this.emailForm = this.fb.group({
      recipientEmail: [data.defaultEmail || '', [Validators.required, Validators.email]],
      customMessage: ['Adjuntamos la guia de remision de su pedido. Por favor, tenga a la mano su identificacion para recibir.']
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