import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Cliente } from '../../../models/cliente.model';
import { PostalService } from '../../../services/postal.service';
import { Observable, of } from 'rxjs';
import { startWith, switchMap, debounceTime, distinctUntilChanged } from 'rxjs/operators';

interface RegimenFiscal {
  clave: string;
  descripcion: string;
  tipoPersona: 'fisica' | 'moral' | 'ambos';
}

@Component({
    selector: 'app-add-client-modal',
    templateUrl: './add-client-modal.component.html',
    styleUrls: ['./add-client-modal.component.css'],
    standalone: false
})
export class AddClientModalComponent implements OnInit {
  clientForm: FormGroup;
  isEditMode: boolean = false;
  
  // Propiedades para autocompletado de código postal
  opcionesFiltradas: Observable<string[]> = of([]);
  colonias: string[] = [];
  
  // Tipos de persona
  tiposPersona = [
    { value: 'fisica', label: 'Física' },
    { value: 'moral', label: 'Moral' }
  ];
  
  // Regímenes fiscales según el SAT
  regimenesFiscales: RegimenFiscal[] = [
    // Personas Físicas
    { clave: '605', descripcion: '605 - Sueldos y Salarios e Ingresos Asimilados a Salarios', tipoPersona: 'fisica' },
    { clave: '606', descripcion: '606 - Arrendamiento', tipoPersona: 'fisica' },
    { clave: '607', descripcion: '607 - Régimen de Enajenación o Adquisición de Bienes', tipoPersona: 'fisica' },
    { clave: '608', descripcion: '608 - Demás ingresos', tipoPersona: 'fisica' },
    { clave: '610', descripcion: '610 - Residentes en el Extranjero sin Establecimiento Permanente en México', tipoPersona: 'fisica' },
    { clave: '611', descripcion: '611 - Ingresos por Dividendos (socios y accionistas)', tipoPersona: 'fisica' },
    { clave: '612', descripcion: '612 - Personas Físicas con Actividades Empresariales y Profesionales', tipoPersona: 'fisica' },
    { clave: '614', descripcion: '614 - Ingresos por intereses', tipoPersona: 'fisica' },
    { clave: '615', descripcion: '615 - Régimen de los ingresos por obtención de premios', tipoPersona: 'fisica' },
    { clave: '616', descripcion: '616 - Sin obligaciones fiscales', tipoPersona: 'fisica' },
    { clave: '620', descripcion: '620 - Sociedades Cooperativas de Producción que optan por diferir sus ingresos', tipoPersona: 'fisica' },
    { clave: '621', descripcion: '621 - Incorporación Fiscal', tipoPersona: 'fisica' },
    { clave: '622', descripcion: '622 - Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras', tipoPersona: 'fisica' },
    { clave: '623', descripcion: '623 - Opcional para Grupos de Sociedades', tipoPersona: 'fisica' },
    { clave: '624', descripcion: '624 - Coordinados', tipoPersona: 'fisica' },
    { clave: '625', descripcion: '625 - Régimen de las Actividades Empresariales con ingresos a través de Plataformas Tecnológicas', tipoPersona: 'fisica' },
    { clave: '626', descripcion: '626 - Régimen Simplificado de Confianza', tipoPersona: 'fisica' },
    
    // Personas Morales
    { clave: '601', descripcion: '601 - General de Ley Personas Morales', tipoPersona: 'moral' },
    { clave: '603', descripcion: '603 - Personas Morales con Fines no Lucrativos', tipoPersona: 'moral' },
    { clave: '607', descripcion: '607 - Régimen de Enajenación o Adquisición de Bienes', tipoPersona: 'moral' },
    { clave: '608', descripcion: '608 - Demás ingresos', tipoPersona: 'moral' },
    { clave: '610', descripcion: '610 - Residentes en el Extranjero sin Establecimiento Permanente en México', tipoPersona: 'moral' },
    { clave: '611', descripcion: '611 - Ingresos por Dividendos (socios y accionistas)', tipoPersona: 'moral' },
    { clave: '614', descripcion: '614 - Ingresos por intereses', tipoPersona: 'moral' },
    { clave: '615', descripcion: '615 - Régimen de los ingresos por obtención de premios', tipoPersona: 'moral' },
    { clave: '616', descripcion: '616 - Sin obligaciones fiscales', tipoPersona: 'moral' },
    { clave: '620', descripcion: '620 - Sociedades Cooperativas de Producción que optan por diferir sus ingresos', tipoPersona: 'moral' },
    { clave: '622', descripcion: '622 - Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras', tipoPersona: 'moral' },
    { clave: '623', descripcion: '623 - Opcional para Grupos de Sociedades', tipoPersona: 'moral' },
    { clave: '624', descripcion: '624 - Coordinados', tipoPersona: 'moral' },
    { clave: '628', descripcion: '628 - Hidrocarburos', tipoPersona: 'moral' },
    { clave: '629', descripcion: '629 - De los Regímenes Fiscales Preferentes y de las Empresas Multinacionales', tipoPersona: 'moral' },
    { clave: '630', descripcion: '630 - Enajenación de acciones en bolsa de valores', tipoPersona: 'moral' }
  ];
  
  // Regímenes filtrados según tipo de persona
  regimenesFiltrados: RegimenFiscal[] = [];
  
  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<AddClientModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: Cliente | null,
    private postalService: PostalService
  ) {
    this.clientForm = this.fb.group({
      ID: [null],
      nombre: ['', [Validators.required, Validators.minLength(2)]],
      tipoPersona: ['', Validators.required],
      Rfc: ['', [Validators.required, Validators.minLength(12), Validators.maxLength(13)]],
      RegFiscal: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      Telefono: ['', [Validators.required, Validators.minLength(10), Validators.pattern(/^[0-9]+$/)]],
      Direccion: ['', Validators.required],
      Ciudad: ['', Validators.required],
      Cpostal: ['', Validators.required],
      Colonia: ['', Validators.required]
    });
  }

  ngOnInit() {
    // Configuración del autocompletado del código postal
    this.opcionesFiltradas = this.clientForm.get('Cpostal')!.valueChanges.pipe(
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

    // Escuchar cambios en el tipo de persona para filtrar regímenes fiscales
    this.clientForm.get('tipoPersona')?.valueChanges.subscribe(tipo => {
      this.filtrarRegimenesFiscales(tipo);
      // Limpiar régimen fiscal si no es compatible con el nuevo tipo
      const regimenActual = this.clientForm.get('RegFiscal')?.value;
      if (regimenActual) {
        const esCompatible = this.regimenesFiltrados.some(r => r.clave === regimenActual);
        if (!esCompatible) {
          this.clientForm.patchValue({ RegFiscal: '' });
        }
      }
    });

    // Si estamos en modo edición, cargar los datos del cliente
    if (this.data) {
      this.isEditMode = !!this.data.isEditing;
      if (this.isEditMode) {
        this.clientForm.patchValue(this.data);
        
        // Filtrar regímenes según el tipo de persona guardado
        if (this.data.tipoPersona) {
          this.filtrarRegimenesFiscales(this.data.tipoPersona);
        }
        
        // Si tiene código postal, cargar las colonias
        if (this.data.Cpostal) {
          this.postalService.buscarColonias(this.data.Cpostal).subscribe(colonias => {
            this.colonias = colonias;
          });
        }
      }
    }
  }

  /**
   * Filtra los regímenes fiscales según el tipo de persona
   */
  filtrarRegimenesFiscales(tipoPersona: string) {
    if (!tipoPersona) {
      this.regimenesFiltrados = [];
      return;
    }
    
    this.regimenesFiltrados = this.regimenesFiscales.filter(regimen => 
      regimen.tipoPersona === tipoPersona || regimen.tipoPersona === 'ambos'
    );
  }

  /**
   * Función para mostrar el valor en el autocomplete
   */
  displayFn(cp: string): string {
    return cp ? cp : '';
  }

  /**
   * Se ejecuta cuando se selecciona un código postal del autocomplete
   */
  onCodigoPostalSeleccionado(event: any) {
    const cp = event.option.value;
    this.postalService.buscarColonias(cp).subscribe(colonias => {
      this.colonias = colonias;
      
      // Si solo hay una colonia, la seleccionamos automáticamente
      if (colonias.length === 1) {
        this.clientForm.patchValue({ Colonia: colonias[0] });
      } else {
        // Si hay múltiples colonias, limpiamos el campo para que el usuario seleccione
        this.clientForm.patchValue({ Colonia: '' });
      }
    });
  }

  onSubmit() {
    if (this.clientForm.valid) {
      const clientData = this.clientForm.value;
      if (!this.isEditMode) {
        delete clientData.ID;
      }
      console.log('Datos del formulario a enviar:', clientData);
      this.dialogRef.close(clientData);
    } else {
      // Marcar todos los campos como tocados para mostrar errores
      this.markFormGroupTouched(this.clientForm);
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

  // Getters para fácil acceso en el template
  get id() { return this.clientForm.get('ID'); }
  get nombre() { return this.clientForm.get('nombre'); }
  get tipoPersona() { return this.clientForm.get('tipoPersona'); }
  get Rfc() { return this.clientForm.get('Rfc'); }
  get RegFiscal() { return this.clientForm.get('RegFiscal'); }
  get email() { return this.clientForm.get('email'); }
  get Telefono() { return this.clientForm.get('Telefono'); }
  get Direccion() { return this.clientForm.get('Direccion'); }
  get Ciudad() { return this.clientForm.get('Ciudad'); }
  get Cpostal() { return this.clientForm.get('Cpostal'); }
  get Colonia() { return this.clientForm.get('Colonia'); }
}