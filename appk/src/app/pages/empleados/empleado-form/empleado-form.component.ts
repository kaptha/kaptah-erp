import { Component, OnInit, Inject } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableDataSource } from '@angular/material/table';
import { DeduccionPercepcion } from '../../../models/nomina.model';
import { Empleado } from '../../../models/empleado.model';
import { CatalogosFiscalesService, TipoPercepcion, TipoDeduccion } from '../../../services/catalogos-fiscales.service';

@Component({
    selector: 'app-empleado-form',
    templateUrl: './empleado-form.component.html',
    styles: [`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      width: 100%;
    }
    form {
      display: flex;
      flex-direction: column;
      height: 100%;
      width: 100%;
    }
    .mat-mdc-dialog-content {
      flex: 1;
      overflow: auto;
      width: 100%;
    }
    .mat-tab-group {
      height: 100%;
      width: 100%;
    }
  `],
    standalone: false
})
export class EmpleadoFormComponent implements OnInit {
  mode: 'create' | 'edit' = 'create';
  empleadoForm!: FormGroup;
  isEditMode: boolean = false;
  displayedColumns: string[] = ['tipo', 'clave', 'concepto', 'importeGravado', 'importeExento', 'acciones'];
  deduccionesDataSource: MatTableDataSource<any>;
  percepcionesDataSource: MatTableDataSource<any>;
  deducciones: DeduccionPercepcion[] = [];
  percepciones: DeduccionPercepcion[] = [];
  
  // Catálogos del SAT
  catalogoPercepciones: TipoPercepcion[] = [];
  catalogoDeducciones: TipoDeduccion[] = [];
  isLoadingCatalogos: boolean = false;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<EmpleadoFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private snackBar: MatSnackBar,
    private catalogosService: CatalogosFiscalesService
  ) {
    this.mode = data?.mode || 'create';
    this.deduccionesDataSource = new MatTableDataSource<any>([]);
    this.percepcionesDataSource = new MatTableDataSource<any>([]);
    this.initForm();
  }

  ngOnInit() {
    this.loadCatalogos();
    
    if (this.data) {
      this.isEditMode = this.data.mode === 'edit';
      if (this.data.empleado) {
        this.empleadoForm.patchValue(this.data.empleado);
        if (this.data.empleado.deducciones || this.data.empleado.percepciones) {
          this.loadDeduccionesPercepciones();
        }
      }
    }
  }

  private loadCatalogos() {
    this.isLoadingCatalogos = true;
    
    // Cargar percepciones vigentes
    this.catalogosService.getPercepcionesVigentes().subscribe({
      next: (percepciones) => {
        this.catalogoPercepciones = percepciones;
      },
      error: (error) => {
        console.error('Error al cargar catálogo de percepciones:', error);
        this.snackBar.open('Error al cargar catálogo de percepciones', 'Cerrar', { duration: 3000 });
      }
    });

    // Cargar deducciones vigentes
    this.catalogosService.getDeduccionesVigentes().subscribe({
      next: (deducciones) => {
        this.catalogoDeducciones = deducciones;
        this.isLoadingCatalogos = false;
      },
      error: (error) => {
        console.error('Error al cargar catálogo de deducciones:', error);
        this.snackBar.open('Error al cargar catálogo de deducciones', 'Cerrar', { duration: 3000 });
        this.isLoadingCatalogos = false;
      }
    });
  }

  private initForm() {
    this.empleadoForm = this.fb.group({
      id: [null],
      nombre: ['', [Validators.required, Validators.minLength(2)]],
      rfc: ['', [Validators.required, Validators.minLength(13), Validators.maxLength(13)]],
      curp: ['', [Validators.required, Validators.minLength(18), Validators.maxLength(18)]],
      email: ['', [Validators.required, Validators.email]],
      telefono: ['', [Validators.required, Validators.pattern(/^[0-9]+$/)]],
      fechaInicio: ['', Validators.required],
      puesto: ['', Validators.required],
      departamento: [''],
      salarioBase: ['', [Validators.required, Validators.min(0)]],
      deducciones: this.fb.array([]),
      percepciones: this.fb.array([])
    });
  }

  get deduccionesFormArray(): FormArray {
    return this.empleadoForm.get('deducciones') as FormArray;
  }

  get percepcionesFormArray(): FormArray {
    return this.empleadoForm.get('percepciones') as FormArray;
  }

  agregarDeduccion() {
    const deduccion = this.fb.group({
      tipo: ['', Validators.required],
      clave: ['', Validators.required],
      concepto: ['', Validators.required],
      importeGravado: [0, [Validators.required, Validators.min(0)]],
      importeExento: [0, [Validators.required, Validators.min(0)]]
    });
    this.deduccionesFormArray.push(deduccion);
    this.deduccionesDataSource.data = this.deduccionesFormArray.controls;
  }

  agregarPercepcion() {
    const percepcion = this.fb.group({
      tipo: ['', Validators.required],
      clave: ['', Validators.required],
      concepto: ['', Validators.required],
      importeGravado: [0, [Validators.required, Validators.min(0)]],
      importeExento: [0, [Validators.required, Validators.min(0)]]
    });
    this.percepcionesFormArray.push(percepcion);
    this.percepcionesDataSource.data = this.percepcionesFormArray.controls;
  }

  eliminarDeduccion(index: number) {
    this.deduccionesFormArray.removeAt(index);
    this.deduccionesDataSource.data = this.deduccionesFormArray.controls;
  }

  eliminarPercepcion(index: number) {
    this.percepcionesFormArray.removeAt(index);
    this.percepcionesDataSource.data = this.percepcionesFormArray.controls;
  }

  // Método para autocompletar el concepto cuando se selecciona una clave de deducción
  onDeduccionClaveChange(index: number, clave: string) {
    const deduccion = this.catalogoDeducciones.find(d => d.c_TipoDeduccion === clave);
    if (deduccion) {
      const deduccionControl = this.deduccionesFormArray.at(index);
      deduccionControl.patchValue({
        concepto: deduccion.descripcion,
        tipo: 'Deducción'
      });
    }
  }

  // Método para autocompletar el concepto cuando se selecciona una clave de percepción
  onPercepcionClaveChange(index: number, clave: string) {
    const percepcion = this.catalogoPercepciones.find(p => p.c_TipoPercepcion === clave);
    if (percepcion) {
      const percepcionControl = this.percepcionesFormArray.at(index);
      percepcionControl.patchValue({
        concepto: percepcion.descripcion,
        tipo: 'Percepción'
      });
    }
  }

  private loadDeduccionesPercepciones() {
    if (this.data.deducciones) {
      this.data.deducciones.forEach((deduccion: DeduccionPercepcion) => {
        const deduccionGroup = this.fb.group({
          tipo: [deduccion.tipo, Validators.required],
          clave: [deduccion.clave, Validators.required],
          concepto: [deduccion.concepto, Validators.required],
          importeGravado: [deduccion.importeGravado, [Validators.required, Validators.min(0)]],
          importeExento: [deduccion.importeExento, [Validators.required, Validators.min(0)]]
        });
        this.deduccionesFormArray.push(deduccionGroup);
      });
      this.deduccionesDataSource.data = this.deduccionesFormArray.controls;
    }

    if (this.data.percepciones) {
      this.data.percepciones.forEach((percepcion: DeduccionPercepcion) => {
        const percepcionGroup = this.fb.group({
          tipo: [percepcion.tipo, Validators.required],
          clave: [percepcion.clave, Validators.required],
          concepto: [percepcion.concepto, Validators.required],
          importeGravado: [percepcion.importeGravado, [Validators.required, Validators.min(0)]],
          importeExento: [percepcion.importeExento, [Validators.required, Validators.min(0)]]
        });
        this.percepcionesFormArray.push(percepcionGroup);
      });
      this.percepcionesDataSource.data = this.percepcionesFormArray.controls;
    }
  }

  onSubmit() {
    if (this.empleadoForm.valid) {
      const formData = this.empleadoForm.value;
      this.dialogRef.close({
        empleado: formData,
        mode: this.mode
      });
    } else {
      this.markFormGroupTouched(this.empleadoForm);
    }
  }

  onCancel() {
    this.dialogRef.close();
  }

  private markFormGroupTouched(formGroup: FormGroup) {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  // Form control getters
  get id() { return this.empleadoForm.get('id'); }
  get nombre() { return this.empleadoForm.get('nombre'); }
  get rfc() { return this.empleadoForm.get('rfc'); }
  get curp() { return this.empleadoForm.get('curp'); }
  get email() { return this.empleadoForm.get('email'); }
  get telefono() { return this.empleadoForm.get('telefono'); }
  get fechaInicio() { return this.empleadoForm.get('fechaInicio'); }
  get puesto() { return this.empleadoForm.get('puesto'); }
  get departamento() { return this.empleadoForm.get('departamento'); }
  get salarioBase() { return this.empleadoForm.get('salarioBase'); }
}