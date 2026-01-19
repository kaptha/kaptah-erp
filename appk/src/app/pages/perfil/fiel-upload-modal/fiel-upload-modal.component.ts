import { Component, ViewEncapsulation, Inject } from '@angular/core';
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
export class FielUploadModalComponent {
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
      issuerSerial: ['', Validators.required]
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
    if (file && file.name.toLowerCase().endsWith('.cer')) {
      this.cerFile = file;
      this.cerFileName = file.name;
      
      try {
        const fileData = await this.readFileAsArrayBuffer(file);
        const certInfo = await this.extractCertificateInfo(fileData);
        
        // ✅ VALIDAR RFC DEL CERTIFICADO vs RFC DEL USUARIO
        if (certInfo.rfc && this.userRfc) {
          const certRfc = certInfo.rfc.toUpperCase().trim();
          const userRfcClean = this.userRfc.toUpperCase().trim();
          
          if (certRfc !== userRfcClean) {
            // ❌ RFC no coincide - mostrar SweetAlert
            Sweetalert.fnc('error', 
              `El RFC del certificado (${certRfc}) no coincide con tu RFC registrado (${userRfcClean}). Por favor intenta con el archivo correcto.`, 
              null
            );
            
            // Limpiar archivos seleccionados
            this.cerFile = null;
            this.cerFileName = null;
            event.target.value = '';
            return;
          }
        }
        
        // ✅ RFC coincide - continuar con el proceso normal
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
    } else {
      this.snackBar.open('Seleccione un archivo .cer válido', 'Cerrar', { duration: 3000 });
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

  private extractCertificateInfo(fileData: ArrayBuffer) {
    try {
      const certBytes = new Uint8Array(fileData);
      const certAsn1 = forge.asn1.fromDer(forge.util.createBuffer(certBytes));
      const cert = forge.pki.certificateFromAsn1(certAsn1);

      // 🔍 DEBUG: Imprimir TODOS los atributos del certificado
      console.log('═══════════════════════════════════════════');
      console.log('📜 SUBJECT ATTRIBUTES:');
      console.log('═══════════════════════════════════════════');
      for (const attr of cert.subject.attributes) {
        console.log(`  ${attr.shortName || attr.name || attr.type}: "${attr.value}"`);
      }
      
      console.log('\n═══════════════════════════════════════════');
      console.log('📜 ISSUER ATTRIBUTES:');
      console.log('═══════════════════════════════════════════');
      for (const attr of cert.issuer.attributes) {
        console.log(`  ${attr.shortName || attr.name || attr.type}: "${attr.value}"`);
      }
      
      if (cert.extensions && cert.extensions.length > 0) {
        console.log('\n═══════════════════════════════════════════');
        console.log('📜 EXTENSIONS:');
        console.log('═══════════════════════════════════════════');
        for (const ext of cert.extensions) {
          console.log(`  ${ext.name || ext.id}:`, ext.value ? String(ext.value).substring(0, 100) : 'N/A');
        }
      }
      console.log('═══════════════════════════════════════════\n');

      // Extraer RFC del certificado - Búsqueda exhaustiva
      let rfc = '';
      let issuerSerial = 'SAT970701NN3';
      const foundRfcs: string[] = [];
      let organizationName = ''; // Para ayudar a identificar el RFC correcto
      
      console.log('🔍 Buscando RFC en el certificado...');
      
      // 1️⃣ Buscar en subject attributes
      for (const attr of cert.subject.attributes) {
        const attrValue = String(attr.value).trim();
        
        // Guardar nombre de la organización para referencia
        if (attr.type === '2.5.4.10' || attr.shortName === 'O') {
          organizationName = attrValue;
          console.log('🏢 Organización:', organizationName);
        }
        
        // Buscar en serialNumber (OID 2.5.4.5)
        if (attr.type === '2.5.4.5' || attr.shortName === 'serialNumber') {
          console.log('🔎 Analizando serialNumber:', attrValue);
          
          // Extraer todos los RFCs del serialNumber (puede contener varios separados por /)
          const rfcsInSerial = attrValue.split('/').map(s => s.trim()).filter(s => this.isValidRfc(s));
          
          if (rfcsInSerial.length > 0) {
            console.log('  📋 RFCs encontrados en serialNumber:', rfcsInSerial);
            foundRfcs.push(...rfcsInSerial);
          }
        }
        
        // Buscar en Common Name (OID 2.5.4.3)
        if (attr.type === '2.5.4.3' || attr.shortName === 'CN') {
          const rfcMatches = attrValue.match(/\b([A-ZÑ&]{3,4}\d{6}[A-Z\d]{3})\b/g);
          if (rfcMatches && rfcMatches.length > 0) {
            console.log('  📋 RFCs encontrados en CN:', rfcMatches);
            foundRfcs.push(...rfcMatches);
          }
        }
        
        // ⭐ MEJORADO: Buscar en x500UniqueIdentifier (OID 2.5.4.45) - separar por /
        if (attr.type === '2.5.4.45' || attr.shortName === 'x500UniqueIdentifier') {
          console.log('🔎 Analizando x500UniqueIdentifier (2.5.4.45):', attrValue);
          
          // Separar por "/" igual que serialNumber
          const rfcsInUniqueId = attrValue.split('/').map(s => s.trim()).filter(s => this.isValidRfc(s));
          
          if (rfcsInUniqueId.length > 0) {
            console.log('  📋 RFCs encontrados en x500UniqueIdentifier:', rfcsInUniqueId);
            foundRfcs.push(...rfcsInUniqueId);
          }
        }
        
        // Buscar en cualquier otro atributo
        if (attrValue.length >= 12 && attrValue.length <= 13 && this.isValidRfc(attrValue)) {
          console.log(`  📋 RFC encontrado en ${attr.shortName || attr.type}:`, attrValue);
          foundRfcs.push(attrValue);
        }
      }
      
      // 2️⃣ Si no se encontró en subject, buscar en extensions
      if (foundRfcs.length === 0 && cert.extensions) {
        for (const ext of cert.extensions) {
          if (ext.value) {
            const extValue = String(ext.value);
            const rfcMatch = extValue.match(/\b([A-ZÑ&]{3,4}\d{6}[A-Z\d]{3})\b/);
            if (rfcMatch) {
              console.log('  📋 RFC encontrado en extensions:', rfcMatch[1]);
              foundRfcs.push(rfcMatch[1]);
            }
          }
        }
      }
      
      // 3️⃣ Filtrar y seleccionar el RFC correcto
      if (foundRfcs.length > 0) {
        // Eliminar duplicados
        const uniqueRfcs = [...new Set(foundRfcs)];
        console.log('📋 RFCs únicos encontrados:', uniqueRfcs);
        
        // Filtrar RFCs genéricos/prueba del SAT
        const genericRfcs = ['XAXX010101000', 'XEXX010101000', 'XEXX010100000'];
        const validRfcs = uniqueRfcs.filter(r => !genericRfcs.includes(r.toUpperCase()));
        
        console.log('📋 RFCs válidos (sin genéricos):', validRfcs);
        
        if (validRfcs.length > 0) {
          // ⭐ NUEVO: Si hay nombre de organización, priorizar RFC que coincida con las iniciales
          if (organizationName && validRfcs.length > 1) {
            console.log('🔍 Intentando emparejar RFC con organización:', organizationName);
            
            // Extraer iniciales del nombre de la organización
            const words = organizationName.split(/\s+/).filter(w => 
              w.length > 2 && 
              !['DE', 'LA', 'DEL', 'LOS', 'LAS', 'AC', 'SA', 'CV', 'Y'].includes(w.toUpperCase())
            );
            
            console.log('  📝 Palabras significativas:', words);
            
            // Para cada RFC válido, calcular un score de coincidencia
            const rfcScores = validRfcs.map(rfcCandidate => {
              const rfcInitials = rfcCandidate.substring(0, 3).toUpperCase();
              let score = 0;
              
              // Extraer iniciales de las primeras 3 palabras
              const orgInitials = words.slice(0, 3).map(w => w[0].toUpperCase()).join('');
              
              if (orgInitials === rfcInitials) {
                score = 100; // Coincidencia perfecta
                console.log(`    ✅ ${rfcCandidate}: Coincidencia perfecta (${rfcInitials} == ${orgInitials})`);
              } else {
                // Contar cuántas iniciales coinciden
                for (let i = 0; i < Math.min(rfcInitials.length, orgInitials.length); i++) {
                  if (rfcInitials[i] === orgInitials[i]) {
                    score += 30;
                  }
                }
                console.log(`    📊 ${rfcCandidate}: Score ${score} (${rfcInitials} vs ${orgInitials})`);
              }
              
              return { rfc: rfcCandidate, score };
            });
            
            // Ordenar por score y tomar el mejor
            rfcScores.sort((a, b) => b.score - a.score);
            
            if (rfcScores[0].score > 0) {
              rfc = rfcScores[0].rfc;
              console.log('✅ RFC seleccionado por coincidencia con organización:', rfc);
            } else {
              // Si no hay coincidencia, usar el primero
              rfc = validRfcs[0];
              console.log('✅ RFC seleccionado (primero de la lista):', rfc);
            }
          } else {
            // Si no hay nombre de organización o solo hay 1 RFC, usar el primero
            rfc = validRfcs[0];
            console.log('✅ RFC seleccionado (no genérico):', rfc);
          }
        } else if (uniqueRfcs.length > 0) {
          // Si solo hay RFCs genéricos, usar el primero
          rfc = uniqueRfcs[0];
          console.log('⚠️ RFC seleccionado (genérico):', rfc);
        }
      }
      
      // 4️⃣ Buscar issuerSerial en issuer attributes
      for (const attr of cert.issuer.attributes) {
        if (attr.type && attr.value && attr.type === '2.5.4.45') {
          issuerSerial = String(attr.value);
          break;
        }
      }

      console.log('📊 Información extraída del certificado:');
      console.log('  - RFC seleccionado:', rfc || '❌ NO ENCONTRADO');
      console.log('  - Certificate Number:', cert.serialNumber);
      console.log('  - Valid From:', cert.validity.notBefore.toISOString());
      console.log('  - Valid Until:', cert.validity.notAfter.toISOString());
      console.log('  - Issuer Serial:', issuerSerial);

      // Formatear las fechas como strings simples
      const validFrom = cert.validity.notBefore.toISOString().split('.')[0];
      const validUntil = cert.validity.notAfter.toISOString().split('.')[0];

      return {
        rfc: rfc,
        certificateNumber: cert.serialNumber,
        serialNumber: cert.serialNumber,
        validFrom: validFrom,
        validUntil: validUntil,
        issuerName: 'SAT',
        issuerSerial: issuerSerial
      };
    } catch (error) {
      console.error('Error al procesar el certificado:', error);
      throw new Error('No se pudo extraer la información del certificado');
    }
  }

  /**
   * Valida formato de RFC mexicano
   */
  private isValidRfc(rfc: string): boolean {
    const rfcPattern = /^[A-ZÑ&]{3,4}\d{6}[A-Z\d]{3}$/;
    return rfcPattern.test(rfc);
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  async onSave(): Promise<void> {
    if (!this.form.valid || !this.keyFile || !this.cerFile) {
      this.snackBar.open('Complete todos los campos requeridos', 'Cerrar', { duration: 3000 });
      return;
    }

    // ✅ VALIDACIÓN FINAL: Verificar RFC del certificado antes de guardar
    try {
      const fileData = await this.readFileAsArrayBuffer(this.cerFile);
      const certInfo = await this.extractCertificateInfo(fileData);
      
      if (certInfo.rfc && this.userRfc) {
        const certRfc = certInfo.rfc.toUpperCase().trim();
        const userRfcClean = this.userRfc.toUpperCase().trim();
        
        if (certRfc !== userRfcClean) {
          Sweetalert.fnc('error', 
            `El RFC del certificado (${certRfc}) no coincide con tu RFC registrado (${userRfcClean}). No se puede guardar este certificado.`, 
            null
          );
          return;
        }
      } else {
        Sweetalert.fnc('error', 
          'No se pudo extraer el RFC del certificado. Verifica que sea un archivo FIEL válido.', 
          null
        );
        return;
      }
    } catch (error) {
      console.error('Error al validar RFC del certificado:', error);
      Sweetalert.fnc('error', 
        'Error al validar el certificado. Por favor intenta de nuevo.', 
        null
      );
      return;
    }

    this.isLoading = true;
    const formValues = this.form.value;

    // Asegurarnos que las fechas sean strings
    const validFrom = typeof formValues.validFrom === 'string' ? 
      formValues.validFrom : 
      formValues.validFrom.toISOString().split('.')[0];
        
    const validUntil = typeof formValues.validUntil === 'string' ? 
      formValues.validUntil : 
      formValues.validUntil.toISOString().split('.')[0];

    console.log('Fechas a enviar:', { validFrom, validUntil });

    this.fielService.uploadFiel(
      this.cerFile,
      this.keyFile,
      formValues.password,
      formValues.certificateNumber,
      formValues.serialNumber,
      validFrom,
      validUntil,
      formValues.issuerName,
      formValues.issuerSerial
    ).subscribe({
      next: (response) => {
        this.snackBar.open('FIEL cargada exitosamente', 'Cerrar', { duration: 3000 });
        this.dialogRef.close(response);
      },
      error: (error) => {
        console.error('Error al cargar FIEL:', error);
        this.snackBar.open(error.error?.message || 'Error al cargar la FIEL', 'Cerrar', { duration: 3000 });
        this.isLoading = false;
      }
    });
  }
}