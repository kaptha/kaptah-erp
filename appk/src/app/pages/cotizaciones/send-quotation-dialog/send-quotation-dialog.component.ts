import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
    selector: 'app-send-quotation-dialog',
  template: `
    <h2 mat-dialog-title class="dialog-title">Enviar Cotizacion por Email</h2>
    
    <mat-dialog-content class="responsive-content">
      <form [formGroup]="emailForm" class="flex-form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Email del destinatario</mat-label>
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

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Estilo del PDF</mat-label>
          <mat-select formControlName="pdfStyle">
            <mat-option value="classic-quote">Clasico</mat-option>
            <mat-option value="modern-quote">Moderno</mat-option>
            <mat-option value="creative-quote">Creativo</mat-option>
            <mat-option value="minimal-quote">Minimalista</mat-option>
            <mat-option value="professional-quote">Profesional</mat-option>
            <mat-option value="formal-quote">Formal</mat-option>
            <mat-option value="blue-quote">Blue</mat-option>
            <mat-option value="clean-quote">Clean</mat-option>
            <mat-option value="mint-quote">Mint</mat-option>
            <mat-option value="purpple-quote">Purpple</mat-option>
          </mat-select>
        </mat-form-field>

        <div class="email-preview">
          <p class="preview-title">Vista previa:</p>
          <div class="preview-details">
            <div class="preview-row">
              <strong>Para:</strong>
              <span class="preview-value">{{emailForm.get('recipientEmail')?.value || 'No especificado'}}</span>
            </div>
            <div class="preview-row">
              <strong>Asunto:</strong>
              <span class="preview-value">Cotizacion COT-{{data.cotizacionId.toString().padStart(6, '0')}}</span>
            </div>
            <div class="preview-row">
              <strong>Adjuntos:</strong>
              <span class="preview-value">cotizacion_{{data.cotizacionId}}.pdf</span>
            </div>
          </div>
        </div>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end" class="dialog-actions">
      <button mat-button (click)="onCancel()">Cancelar</button>
      <button mat-raised-button class="btn-primary" 
        (click)="onSend()" 
        [disabled]="!emailForm.valid || sending"
        class="send-button">
        <mat-icon *ngIf="!sending">send</mat-icon>
        <mat-spinner *ngIf="sending" diameter="20"></mat-spinner>
        <span>{{sending ? 'Enviando...' : 'Enviar Email'}}</span>
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    :host {
      display: block;
    }

    .responsive-content {
      display: flex;
      flex-direction: column;
      gap: 8px;
      min-width: 0;
      max-width: 500px;
      padding: 10px 24px 0;
      overflow-x: hidden;
    }

    .flex-form {
      display: flex;
      flex-direction: column;
    }

    .full-width {
      width: 100%;
      margin-bottom: 8px;
    }

    .email-preview {
      margin-top: 8px;
      padding: 16px;
      background: #f8f9fa;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
    }

    .preview-title {
      margin: 0 0 8px 0;
      font-weight: 600;
      color: #444;
      font-size: 0.85rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .preview-details {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .preview-row {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      font-size: 13px;
      color: #666;
      line-height: 1.4;
    }

    .preview-value {
      min-width: 0;
      word-break: break-word;
      overflow-wrap: break-word;
    }

    mat-spinner {
      display: inline-block;
      margin-right: 8px;
      vertical-align: middle;
    }

    .dialog-actions {
      padding: 12px 24px 16px;
      gap: 8px;
    }

    @media (min-width: 600px) {
      .responsive-content {
        width: 500px;
      }
    }

    @media (max-width: 480px) {
      .responsive-content {
        padding: 10px 16px 0;
      }

      .dialog-title {
        font-size: 1.1rem;
      }

      .dialog-actions {
        flex-direction: column-reverse;
        align-items: stretch;
        gap: 8px;
        padding: 12px 16px 16px;
      }

      .dialog-actions button {
        width: 100%;
        margin: 0 !important;
      }

      .email-preview {
        padding: 12px;
      }

      .preview-row {
        flex-direction: column;
        gap: 0;
      }
    }
  `],
    standalone: false
})
export class SendQuotationDialogComponent {
  emailForm: FormGroup;
  sending = false;

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<SendQuotationDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { 
      cotizacionId: number; 
      clientName: string;
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
      customMessage: ['Le enviamos nuestra cotizacion. Valida por 15 dias.'],
      pdfStyle: ['classic-quote']
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