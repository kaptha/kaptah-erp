import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
   selector: 'app-send-email-dialog',
  template: `
    <h2 mat-dialog-title class="dialog-header">Enviar Nota de Venta</h2>
    
    <mat-dialog-content class="dialog-container">
      <form [formGroup]="emailForm" class="responsive-form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Email del destinatario</mat-label>
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
            placeholder="Mensaje adicional para el cliente"></textarea>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Estilo del PDF</mat-label>
          <mat-select formControlName="pdfStyle">
            <mat-option value="classic-delivery">Clásico</mat-option>
            <mat-option value="modern-delivery">Moderno</mat-option>
            <mat-option value="creative-delivery">Creativo</mat-option>
            <mat-option value="minimal-delivery">Minimalista</mat-option>
            <mat-option value="profesional-delivery">Profesional</mat-option>
            <mat-option value="simple-delivery">Simple</mat-option>
            <mat-option value="elegant-delivery">Elegante</mat-option>
            <mat-option value="wave-delivery">Wave</mat-option>
            <mat-option value="orange-delivery">Orange</mat-option>
            <mat-option value="friendly-delivery">Friendly</mat-option>
          </mat-select>
        </mat-form-field>

        <div class="preview-card">
          <span class="preview-badge">Vista previa</span>
          <div class="preview-content">
            <p><strong>Para:</strong> {{emailForm.get('recipientEmail')?.value || '---'}}</p>
            <p><strong>Asunto:</strong> Nota de Venta #{{data.noteId.substring(0, 8)}}</p>
            <p class="attachment">
              <mat-icon>attach_file</mat-icon>
              nota_venta_{{data.noteId.substring(0, 8)}}.pdf
            </p>
          </div>
        </div>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end" class="actions-container">
      <button mat-button (click)="onCancel()" [disabled]="sending">Cancelar</button>
      <button mat-raised-button color="primary" 
        (click)="onSend()" 
        [disabled]="!emailForm.valid || sending"
        class="main-send-button">
        <mat-icon *ngIf="!sending">send</mat-icon>
        <mat-spinner *ngIf="sending" diameter="20"></mat-spinner>
        <span>{{sending ? 'Enviando...' : 'Enviar Nota'}}</span>
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    /* Estructura Base */
    .dialog-container {
      min-width: 280px;
      max-width: 500px;
      margin-bottom: 8px;
    }

    .responsive-form {
      display: flex;
      flex-direction: column;
      padding-top: 10px;
    }

    .full-width {
      width: 100%;
      margin-bottom: 4px;
    }

    /* Tarjeta de Vista Previa Estilizada */
    .preview-card {
      background-color: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 12px;
      margin-top: 8px;
      position: relative;
    }

    .preview-badge {
      font-size: 10px;
      text-transform: uppercase;
      background: #eee;
      padding: 2px 6px;
      border-radius: 4px;
      font-weight: bold;
      color: #666;
      position: absolute;
      top: -10px;
      right: 12px;
      border: 1px solid #e5e7eb;
    }

    .preview-content p {
      margin: 4px 0;
      font-size: 13px;
      color: #4b5563;
      line-height: 1.4;
    }

    .attachment {
      display: flex;
      align-items: center;
      gap: 4px;
      color: #2563eb !important; /* Azul para resaltar el archivo */
      font-weight: 500;
    }

    .attachment mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    /* Spinner */
    mat-spinner {
      display: inline-block;
      margin-right: 8px;
    }

    /* Responsividad */
    @media (min-width: 600px) {
      .dialog-container {
        width: 450px;
      }
    }

    @media (max-width: 480px) {
      .actions-container {
        flex-direction: column-reverse;
        padding: 16px !important;
        gap: 10px;
      }

      .actions-container button {
        width: 100%;
        margin-left: 0 !important;
      }

      .dialog-header {
        font-size: 1.1rem;
        line-height: 1.2;
      }
    }
  `],
    standalone: false
})
export class SendEmailDialogComponent {
  emailForm: FormGroup;
  sending = false;

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<SendEmailDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { 
      noteId: string; 
      customerName: string;
      defaultEmail?: string;
    }
  ) {
    this.emailForm = this.fb.group({
      recipientEmail: [data.defaultEmail || '', [Validators.required, Validators.email]],
      customMessage: ['Le enviamos su nota de venta. Gracias por su preferencia.'],
      pdfStyle: ['classic-delivery']
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


