import { Component, ViewEncapsulation, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FielService } from '../../../services/fiel.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import * as forge from 'node-forge';
import { Sweetalert } from '../../../functions';

@Component({
    selector: 'app-fiel-upload-modal',
    templateUrl: './fiel-upload-modal.component.html',
    styleUrls: ['./fiel-upload-modal.component.css'],
    encapsulation: ViewEncapsulation.None,
    standalone: false
})
export class FielUploadModalComponent implements OnInit {
  form: FormGroup;
  keyFile: File | null = null;
  cerFile: File | null = null;
  keyFileName: string | null = null;
  cerFileName: string | null = null;
  isLoading = false;
  modalTitle: string = 'Subir Firma Electrónica Avanzada (FIEL)';
  userRfc: string = '';

  constructor(
    public dialogRef: MatDialogRef<FielUploadModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { userRfc: string },
    private fielService: FielService,
    private snackBar: MatSnackBar,
    private fb: FormBuilder
  ) {
    this.dialogRef.disableClose = false;
    this.userRfc = data?.userRfc || '';

    this.form = this.fb.group({
      password: ['', Validators.required],
      certificateNumber: ['', Validators.required],
      serialNumber: ['', Validators.required],
      validFrom: ['', Validators.required],
      validUntil: ['', Validators.required],
      issuerName: ['SAT', Validators.required],
      issuerSerial: ['', Validators.required],
      // Consentimiento para descarga masiva automática (cert-vault cifra la contraseña solo si es true)
      autorizarDescargaMasiva: [true]
    });
  }

  ngOnInit(): void {
    // Asegura que el diálogo tenga la altura adecuada
    setTimeout(() => {
      const dialogContainer = document.querySelector('.mat-dialog-container');
      if (dialogContainer) {
        dialogContainer.setAttribute('style', 'max-height: 90vh; overflow: hidden;');
      }
    });
  }

  onKeyFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file && file.name.toLowerCase().endsWith('.key')) {
      this.keyFile = file;
      this.keyFileName = file.name;
    } else {
      this.snackBar.open('Seleccione un archivo .key válido', 'Cerrar', { duration: 3000 });
    }
  }

  async onCerFileSelected(event: any): Promise<void> {
    const file = event.target.files[0];
    if (!(file && file.name.toLowerCase().endsWith('.cer'))) {
      this.snackBar.open('Seleccione un archivo .cer válido', 'Cerrar', { duration: 3000 });
      return;
    }

    this.cerFile = file;
    this.cerFileName = file.name;

    try {
      const fileData = await this.readFileAsArrayBuffer(file);
      const certInfo = this.extractCertificateInfo(fileData);

      if (certInfo.rfc && this.userRfc) {
        const certRfc = certInfo.rfc.toUpperCase().trim();
        const userRfcClean = this.userRfc.toUpperCase().trim();

        if (certRfc !== userRfcClean) {
          Sweetalert.fnc('error',
            `El RFC del certificado (${certRfc}) no coincide con tu RFC registrado (${userRfcClean}). Por favor intenta con el archivo correcto.`,
            null
          );
          this.cerFile = null;
          this.cerFileName = null;
          event.target.value = '';
          return;
        }
      }

      this.form.patchValue({
        certificateNumber: certInfo.certificateNumber,
        serialNumber: certInfo.serialNumber,
        validFrom: certInfo.validFrom,
        validUntil: certInfo.validUntil,
        issuerName: 'SAT',
        issuerSerial: certInfo.issuerSerial
      });

      this.snackBar.open('Certificado válido. RFC verificado correctamente.', 'Cerrar', { duration: 3000 });
    } catch (error) {
      console.error('Error al leer el certificado:', error);
      this.snackBar.open('Error al leer el certificado', 'Cerrar', { duration: 3000 });
      this.cerFile = null;
      this.cerFileName = null;
      event.target.value = '';
    }
  }

  private readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Lee RFC, número de certificado, vigencia y serial del emisor.
   * En certificados del SAT el RFC viene en x500UniqueIdentifier (2.5.4.45) como "RFC / CURP".
   */
  private extractCertificateInfo(fileData: ArrayBuffer) {
    try {
      const certBytes = new Uint8Array(fileData);
      const certAsn1 = forge.asn1.fromDer(forge.util.createBuffer(certBytes));
      const cert = forge.pki.certificateFromAsn1(certAsn1);

      const genericRfcs = ['XAXX010101000', 'XEXX010101000', 'XEXX010100000'];
      const candidates: string[] = [];

      for (const attr of cert.subject.attributes) {
        const value = String(attr.value).trim();
        const isRfcField =
          attr.type === '2.5.4.45' || attr.shortName === 'x500UniqueIdentifier' ||
          attr.type === '2.5.4.5' || attr.shortName === 'serialNumber';
        if (isRfcField) {
          candidates.push(...value.split('/').map(s => s.trim()).filter(s => this.isValidRfc(s)));
        }
      }
      if (candidates.length === 0) {
        for (const attr of cert.subject.attributes) {
          const m = String(attr.value).match(/\b([A-ZÑ&]{3,4}\d{6}[A-Z\d]{3})\b/g);
          if (m) candidates.push(...m);
        }
      }
      const unique = [...new Set(candidates)];
      const rfc = unique.find(r => !genericRfcs.includes(r.toUpperCase())) || unique[0] || '';

      let issuerSerial = 'SAT970701NN3';
      for (const attr of cert.issuer.attributes) {
        if (attr.type === '2.5.4.45' && attr.value) {
          issuerSerial = String(attr.value);
          break;
        }
      }

      return {
        rfc,
        certificateNumber: cert.serialNumber,
        serialNumber: cert.serialNumber,
        validFrom: cert.validity.notBefore.toISOString().split('.')[0],
        validUntil: cert.validity.notAfter.toISOString().split('.')[0],
        issuerName: 'SAT',
        issuerSerial
      };
    } catch (error) {
      console.error('Error al procesar el certificado:', error);
      throw new Error('No se pudo extraer la información del certificado');
    }
  }

  private isValidRfc(rfc: string): boolean {
    return /^[A-ZÑ&]{3,4}\d{6}[A-Z\d]{3}$/.test(rfc);
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  async onSave(): Promise<void> {
    if (!this.form.valid || !this.keyFile || !this.cerFile) {
      this.snackBar.open('Complete todos los campos requeridos', 'Cerrar', { duration: 3000 });
      return;
    }

    // Validación final del RFC antes de enviar
    try {
      const fileData = await this.readFileAsArrayBuffer(this.cerFile);
      const certInfo = this.extractCertificateInfo(fileData);
      if (!certInfo.rfc) {
        Sweetalert.fnc('error', 'No se pudo extraer el RFC del certificado. Verifica que sea un archivo FIEL válido.', null);
        return;
      }
      if (this.userRfc && certInfo.rfc.toUpperCase().trim() !== this.userRfc.toUpperCase().trim()) {
        Sweetalert.fnc('error',
          `El RFC del certificado (${certInfo.rfc}) no coincide con tu RFC registrado (${this.userRfc.toUpperCase().trim()}). No se puede guardar este certificado.`,
          null
        );
        return;
      }
    } catch (error) {
      console.error('Error al validar RFC del certificado:', error);
      Sweetalert.fnc('error', 'Error al validar el certificado. Por favor intenta de nuevo.', null);
      return;
    }

    this.isLoading = true;
    const v = this.form.value;
    const validFrom = typeof v.validFrom === 'string' ? v.validFrom : v.validFrom.toISOString().split('.')[0];
    const validUntil = typeof v.validUntil === 'string' ? v.validUntil : v.validUntil.toISOString().split('.')[0];

    // cert-vault valida que sea FIEL (no CSD), que la llave abra con la contraseña y que esté vigente.
    // Ya no se envía a SIFEI: la descarga masiva se hace directo con el SAT.
    this.fielService.uploadFiel(
      this.cerFile,
      this.keyFile,
      v.password,
      v.certificateNumber,
      v.serialNumber,
      validFrom,
      validUntil,
      v.issuerName,
      v.issuerSerial,
      v.autorizarDescargaMasiva === true
    ).subscribe({
      next: (response) => {
        const msg = response?.descargaMasivaAutorizada
          ? 'FIEL guardada. Tus CFDI se descargarán del SAT automáticamente cada día.'
          : 'FIEL guardada. La descarga automática del SAT quedó desactivada.';
        this.snackBar.open(msg, 'Cerrar', { duration: 5000 });
        this.dialogRef.close(response);
      },
      error: (error) => {
        console.error('Error al cargar FIEL:', error);
        this.snackBar.open(error.error?.message || 'Error al cargar la FIEL', 'Cerrar', { duration: 5000 });
        this.isLoading = false;
      }
    });
  }
}
