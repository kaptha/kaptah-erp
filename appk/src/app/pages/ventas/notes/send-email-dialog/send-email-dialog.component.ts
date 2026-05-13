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
            <mat-option value="classic-delivery">Clasico</mat-option>
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
            <div class="preview-row">
              <strong>Para:</strong>
              <span class="preview-value">{{emailForm.get('recipientEmail')?.value || '---'}}</span>
            </div>
            <div class="preview-row">
              <strong>Asunto:</strong>
              <span class="preview-value">Nota de Venta #{{data.noteId.substring(0, 8)}}</span>
            </div>
            <div class="attachment">
              <mat-icon>attach_file</mat-icon>
              <span class="preview-value">nota_venta_{{data.noteId.substring(0, 8)}}.pdf</span>
            </div>
          </div>
        </div>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end" class="actions-container">
      <button mat-button (click)="onCancel()" [disabled]="sending">Cancelar</button>
      <button mat-raised-button class="btn-primary" 
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
    :host {
      display: block;
    }

    .dialog-container {
      min-width: 0;
      max-width: 500px;
      padding: 0 24px;
      overflow-x: hidden;
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

    .preview-content {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .preview-row {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      font-size: 13px;
      color: #4b5563;
      line-height: 1.4;
    }

    .preview-value {
      min-width: 0;
      word-break: break-word;
    }

    .attachment {
      display: flex;
      align-items: center;
      gap: 4px;
      color: #2563eb;
      font-weight: 500;
      font-size: 13px;
      min-width: 0;
    }

    .attachment mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      min-width: 16px;
    }

    mat-spinner {
      display: inline-block;
      margin-right: 8px;
    }

    .actions-container {
      padding: 12px 24px 16px;
      gap: 8px;
    }

    @media (min-width: 600px) {
      .dialog-container {
        width: 450px;
      }
    }

    @media (max-width: 480px) {
      .dialog-container {
        padding: 0 16px;
      }

      .actions-container {
        flex-direction: column-reverse;
        padding: 12px 16px 16px;
        gap: 8px;
      }

      .actions-container button {
        width: 100%;
        margin-left: 0 !important;
      }

      .dialog-header {
        font-size: 1.1rem;
        line-height: 1.2;
      }

      .preview-card {
        padding: 10px;
      }

      .preview-row {
        flex-direction: column;
        gap: 0;
      }

      .attachment {
        word-break: break-all;
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
    const isMobile = window.innerWidth < 480;
    this.dialogRef.updateSize(
      isMobile ? '95vw' : '480px',
      'auto'
    );

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