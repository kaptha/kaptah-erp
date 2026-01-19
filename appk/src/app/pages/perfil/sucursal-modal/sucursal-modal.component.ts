import { Component, OnInit, Output, EventEmitter, ViewEncapsulation } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { startWith, switchMap, map, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Observable, of } from 'rxjs';
import { PostalService } from '../../../services/postal.service';
import { SucursalesService } from '../../../services/sucursales.service';
@Component({
    selector: 'app-sucursal-modal',
    templateUrl: './sucursal-modal.component.html',
    styleUrls: ['./sucursal-modal.component.css'],
    encapsulation: ViewEncapsulation.None,
    standalone: false
})
export class SucursalModalComponent implements OnInit {
  sucursalForm: FormGroup;
  opcionesFiltradas: Observable<string[]> = of([]);
  colonias: string[] = [];

  constructor(
    private postalService: PostalService,
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<SucursalModalComponent>,
    private sucursalesService: SucursalesService,
    private snackBar: MatSnackBar
  ) {
    this.sucursalForm = this.fb.group({
      alias: ['', [Validators.required]],
      telefono: ['', [Validators.required]],
      direccion: ['', [Validators.required]],
      codigoPostal: ['', [
        Validators.required,
        Validators.min(10000),
        Validators.max(99999),
        Validators.pattern(/^[0-9]{5}$/)
      ]],
      colonia: ['', [Validators.required]]
    });
  }

  onSubmit() {
    if (this.sucursalForm.valid) {
      const formData = this.sucursalForm.value;
      
      this.sucursalesService.createSucursal(formData)
        .subscribe({
          next: (response) => {
            this.snackBar.open('Sucursal creada exitosamente', 'Cerrar', {
              duration: 3000
            });
            this.dialogRef.close(true);
          },
          error: (error) => {
            this.snackBar.open(error.message, 'Cerrar', {
              duration: 5000
            });
          }
        });
    } else {
      // Mostrar errores de validación
      if (this.sucursalForm.get('codigoPostal')?.errors) {
        this.snackBar.open(
          'El código postal debe ser un número de 5 dígitos entre 10000 y 99999', 
          'Cerrar', 
          { duration: 5000 }
        );
      }
    }
  }

  ngOnInit() {
    this.opcionesFiltradas = this.sucursalForm.get('codigoPostal')!.valueChanges.pipe(
      startWith(''),
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(value => {
        if (value && value.length >= 3) {
          return this.postalService.buscarCodigosPostales(value);
        } else {
          return of([]);
        }
      })
    );
  }

  displayFn(cp: string): string {
    return cp ? cp : '';
  }

  onCodigoPostalSeleccionado(event: any) {
    const cp = event.option.value;
    this.postalService.buscarColonias(cp).subscribe(colonias => {
      this.colonias = colonias;
      if (colonias.length === 1) {
        this.sucursalForm.patchValue({ colonia: colonias[0] });
      }
    });
  }

  guardarSucursal() {
    if (this.sucursalForm.valid) {
      this.dialogRef.close(this.sucursalForm.value);
    }
  }
}
