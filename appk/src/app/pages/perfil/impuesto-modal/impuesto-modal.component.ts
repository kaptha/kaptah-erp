import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ImpuestosService } from '../../../services/impuestos.service';

@Component({
    selector: 'app-impuesto-modal',
    templateUrl: './impuesto-modal.component.html',
    styleUrls: ['./impuesto-modal.component.css'],
    standalone: false
})
export class ImpuestoModalComponent {
  impuestoForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<ImpuestoModalComponent>,
    private impuestosService: ImpuestosService,
    private snackBar: MatSnackBar
  ) {
    this.impuestoForm = this.fb.group({
      alias: ['', Validators.required],
      uso: ['', Validators.required],
      tipo_impuesto: ['', Validators.required],
      impuesto: ['', Validators.required],
      tasa: ['', [Validators.required, Validators.min(0)]],
      valor_cuota: ['', Validators.required]
    });
  }

  onSubmit() {
    console.log('onSubmit llamado');
    console.log('Estado del formulario:', this.impuestoForm.valid);
    console.log('Valores del formulario:', this.impuestoForm.value);
    if (this.impuestoForm.valid) {
        console.log('Formulario válido, enviando datos...');
        this.impuestosService.createImpuesto(this.impuestoForm.value)
            .subscribe({
                next: (response) => {
                    console.log('Respuesta exitosa:', response);
                    this.snackBar.open('Impuesto creado exitosamente', 'Cerrar', {
                        duration: 3000
                    });
                    this.dialogRef.close(true);
                },
                error: (error) => {
                    console.error('Error al crear impuesto:', error);
                    this.snackBar.open('Error al crear el impuesto', 'Cerrar', {
                        duration: 3000
                    });
                }
            });
    } else {
        console.log('Formulario inválido');
        console.log('Errores:', this.impuestoForm.errors);
        Object.keys(this.impuestoForm.controls).forEach(key => {
            const control = this.impuestoForm.get(key);
            if (control?.errors) {
                console.log(`Errores en ${key}:`, control.errors);
            }
        });
    }
}
}
