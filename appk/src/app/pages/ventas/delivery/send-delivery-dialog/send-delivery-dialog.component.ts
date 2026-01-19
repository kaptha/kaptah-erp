import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
    selector: 'app-send-delivery-dialog',
    template: `
    <h2 mat-dialog-title>Enviar Guía de Remisión por Email</h2>
    
    <mat-dialog-content>
      <form [formGroup]="emailForm">
        <mat-form-field appearance="outline" style="width: 100%; margin-bottom: 16px;">
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

        <mat-form-field appearance="outline" style="width: 100%; margin-bottom: 16px;">
          <mat-label>Mensaje personalizado (opcional)</mat-label>
          <textarea matInput formControlName="customMessage" rows="3" 
            placeholder="Mensaje adicional para el cliente"></textarea>
        </mat-form-field>

        <div class="email-preview" style="margin-top: 16px; padding: 12px; background: #f5f5f5; border-radius: 4px;">
          <p style="margin: 0 0 8px 0; font-weight: 500;">Vista previa:</p>
          <p style="margin: 0; font-size: 14px; color: #666;">
            <strong>Para:</strong> {{emailForm.get('recipientEmail')?.value || 'No especificado'}}<br>
            <strong>Guía:</strong> #{{data.deliveryNoteId.substring(0, 8)}}<br>
            <strong>Orden:</strong> #{{data.salesOrderId.substring(0, 8)}}<br>
            <strong>Fecha:</strong> {{data.deliveryDate | date:'dd/MM/yyyy'}}
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
        {{sending ? 'Enviando...' : 'Enviar Guía'}}
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