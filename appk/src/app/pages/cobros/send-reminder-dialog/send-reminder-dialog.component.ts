import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
    selector: 'app-send-reminder-dialog',
    template: `
    <h2 mat-dialog-title>Enviar Recordatorio de Pago</h2>
    
    <mat-dialog-content>
      <form [formGroup]="emailForm">
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
            placeholder="Mensaje adicional para el cliente"></textarea>
        </mat-form-field>

        <div class="email-preview">
          <p class="preview-title">Vista previa:</p>
          <div class="preview-body">
            <div class="preview-row">
              <span class="preview-label">Para:</span>
              <span class="preview-value">{{emailForm.get('recipientEmail')?.value || 'No especificado'}}</span>
            </div>
            <div class="preview-row">
              <span class="preview-label">Cliente:</span>
              <span class="preview-value">{{data.customerName}}</span>
            </div>
            <div class="preview-row">
              <span class="preview-label">Monto Pendiente:</span>
              <span class="preview-value">{{data.dueAmount | currency}}</span>
            </div>
            <div class="preview-row">
              <span class="preview-label">Fecha de Vencimiento:</span>
              <span class="preview-value">{{data.dueDate | date:'dd/MM/yyyy'}}</span>
            </div>
          </div>
        </div>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions class="dialog-actions">
      <button mat-button (click)="onCancel()">Cancelar</button>
      <button mat-raised-button class="btn-primary" 
        (click)="onSend()" 
        [disabled]="!emailForm.valid || sending">
        <mat-icon *ngIf="!sending">send</mat-icon>
        <mat-spinner *ngIf="sending" diameter="20" class="send-spinner"></mat-spinner>
        {{sending ? 'Enviando...' : 'Enviar Recordatorio'}}
      </button>
    </mat-dialog-actions>
  `,
    styles: [`
    :host {
      display: block;
    }

    mat-dialog-content {
      min-width: 0;
      max-width: 500px;
      padding: 0 24px;
      overflow-x: hidden;
    }

    .full-width {
      width: 100%;
      margin-bottom: 8px;
    }

    .email-preview {
      margin-top: 8px;
      padding: 12px 16px;
      background: #f5f5f5;
      border-radius: 8px;
      border: 1px solid #e0e0e0;
    }

    .preview-title {
      margin: 0 0 8px 0;
      font-weight: 500;
      font-size: 14px;
    }

    .preview-body {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .preview-row {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      font-size: 13px;
      color: #555;
      line-height: 1.4;
    }

    .preview-label {
      font-weight: 600;
      color: #333;
      white-space: nowrap;
    }

    .preview-value {
      word-break: break-word;
      min-width: 0;
    }

    .dialog-actions {
      padding: 12px 24px 16px;
      gap: 8px;
    }

    .send-spinner {
      display: inline-block;
      margin-right: 8px;
    }

    /* Mobile: pantallas < 480px */
    @media (max-width: 480px) {
      mat-dialog-content {
        padding: 0 16px;
      }

      .dialog-actions {
        padding: 12px 16px 16px;
        flex-direction: column-reverse;
      }

      .dialog-actions button {
        width: 100%;
      }

      .preview-row {
        flex-direction: column;
        gap: 0;
      }

      .email-preview {
        padding: 10px 12px;
      }
    }
  `],
    standalone: false
})
export class SendReminderDialogComponent {
  emailForm: FormGroup;
  sending = false;

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<SendReminderDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { 
      accountId: string;
      customerName: string;
      dueAmount: number;
      dueDate: string;
      defaultEmail?: string;
    }
  ) {
    // Ajustar ancho del dialog en móviles
    const isMobile = window.innerWidth < 480;
    this.dialogRef.updateSize(
      isMobile ? '95vw' : '480px',
      'auto'
    );

    this.emailForm = this.fb.group({
      recipientEmail: [data.defaultEmail || '', [Validators.required, Validators.email]],
      customMessage: ['Estimado cliente, le recordamos que tiene un pago pendiente. Por favor, regularice su situacion a la brevedad.']
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