import { Component, OnInit, Output, EventEmitter, Inject } from '@angular/core';
import { PostalService } from '../../../services/postal.service';
import { Proveedor } from '../../../models/proveedor.model';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { startWith, switchMap, map, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Observable, of } from 'rxjs';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ApibizService } from '../../../services/apibiz.service';
import Swal from 'sweetalert2';

interface RegimenFiscal {
  clave: string;
  descripcion: string;
  tipoPersona: 'fisica' | 'moral' | 'ambos';
}

@Component({
    selector: 'app-modal-prov',
    templateUrl: './modal-prov.component.html',
    styleUrls: ['./modal-prov.component.css'],
    standalone: false
})
export class ModalProvComponent implements OnInit {
  @Output() guardarProveedorEvent = new EventEmitter<Proveedor>();
  proveedorForm!: FormGroup;
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

  // Catálogos para los selectores
  tiposCuenta = ['Cheques', 'Ahorro'];
  bancos = ['BBVA', 'Santander', 'Banorte', 'HSBC', 'Scotiabank', 'Citibanamex', 'Inbursa', 'Azteca', 'Otros'];

  constructor(
    private postalService: PostalService,
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<ModalProvComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { proveedor?: Proveedor, titulo: string },
    private apibizService: ApibizService
  ) {
    this.initializeForm();
    
    // Si recibimos un proveedor existente, cargamos sus datos
    if (data && data.proveedor) {
      this.loadProveedorData(data.proveedor);
    }
  }

  private initializeForm() {
    this.proveedorForm = this.fb.group({
      // Información básica
      nombre: ['', [Validators.required, Validators.minLength(2)]],
      razon_social: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      telefono: ['', [Validators.required, Validators.minLength(10), Validators.pattern(/^[0-9]+$/)]],

      // Información fiscal
      tipo_contribuyente: ['', Validators.required],
      rfc: ['', [Validators.required, Validators.minLength(12), Validators.maxLength(13)]],
      regimen_fiscal: ['', Validators.required],

      // Dirección
      Cpostal: ['', Validators.required],
      colonia: ['', Validators.required],
      calle: ['', Validators.required],
      numero_ext: ['', Validators.required],
      numero_int: [''],
      estado: ['', Validators.required],
      municipio: ['', Validators.required],

      // Información bancaria
      banco: ['', Validators.required],
      cuenta_bancaria: ['', [Validators.required, Validators.minLength(10)]],
      tipo_cuenta: ['', Validators.required],
      clabe: ['', [Validators.minLength(18), Validators.maxLength(18)]],
      beneficiario: ['', Validators.required],

      // Información comercial
      limite_credito: [0, [Validators.required, Validators.min(0)]],
      dias_credito: [0, [Validators.required, Validators.min(0)]],
      notas: ['']
    });
  }

  ngOnInit() {
  // Configuración del autocompletado del código postal
  this.opcionesFiltradas = this.proveedorForm.get('Cpostal')!.valueChanges.pipe(
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

  // ✅ AGREGAR: Convertir RFC a mayúsculas automáticamente
  this.proveedorForm.get('rfc')?.valueChanges.subscribe(value => {
    if (value && typeof value === 'string') {
      const upperValue = value.toUpperCase();
      if (value !== upperValue) {
        this.proveedorForm.get('rfc')?.setValue(upperValue, { emitEvent: false });
      }
    }
  });

  // Escuchar cambios en el tipo de persona para filtrar regímenes fiscales
  this.proveedorForm.get('tipo_contribuyente')?.valueChanges.subscribe(tipo => {
    this.filtrarRegimenesFiscales(tipo);
    const regimenActual = this.proveedorForm.get('regimen_fiscal')?.value;
    if (regimenActual) {
      const esCompatible = this.regimenesFiltrados.some(r => r.clave === regimenActual);
      if (!esCompatible) {
        this.proveedorForm.patchValue({ regimen_fiscal: '' });
      }
    }
  });
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

  private loadProveedorData(proveedor: Proveedor): void {
    // Solo poblamos los campos que existen en el formulario
    const formControls = Object.keys(this.proveedorForm.controls);
    
    Object.keys(proveedor).forEach(key => {
      if (formControls.includes(key) && proveedor[key as keyof Proveedor] !== undefined) {
        this.proveedorForm.get(key)?.setValue(proveedor[key as keyof Proveedor]);
      }
    });

    // Filtrar regímenes según el tipo de persona guardado
    if (proveedor.tipo_contribuyente) {
      this.filtrarRegimenesFiscales(proveedor.tipo_contribuyente);
    }

    // Si tiene código postal, cargamos las colonias
    if (proveedor.Cpostal) {
      this.postalService.buscarColonias(proveedor.Cpostal).subscribe(colonias => {
        this.colonias = colonias;
      });
    }
  }

  displayFn(cp: string): string {
    return cp ? cp : '';
  }

  onCodigoPostalSeleccionado(event: any) {
    const cp = event.option.value;
    this.postalService.buscarColonias(cp).subscribe(colonias => {
      this.colonias = colonias;
      if (colonias.length === 1) {
        this.proveedorForm.patchValue({ colonia: colonias[0] });
      } else {
        this.proveedorForm.patchValue({ colonia: '' });
      }
      
      // Actualizar estado y municipio basado en CP
      this.actualizarEstadoMunicipio(cp);
    });
  }

  // Método auxiliar para mapear CPs a estados/municipios
  private actualizarEstadoMunicipio(cp: string) {
    const firstDigits = cp.substring(0, 2);
    
    const estadosPorCP: {[key: string]: {estado: string, municipio: string}} = {
      '01': {estado: 'Ciudad de México', municipio: 'Álvaro Obregón'},
      '02': {estado: 'Ciudad de México', municipio: 'Azcapotzalco'},
      '03': {estado: 'Ciudad de México', municipio: 'Benito Juárez'},
      '04': {estado: 'Ciudad de México', municipio: 'Coyoacán'},
      '05': {estado: 'Ciudad de México', municipio: 'Cuajimalpa'},
      '06': {estado: 'Ciudad de México', municipio: 'Cuauhtémoc'},
      '07': {estado: 'Ciudad de México', municipio: 'Gustavo A. Madero'},
      '08': {estado: 'Ciudad de México', municipio: 'Iztacalco'},
      '09': {estado: 'Ciudad de México', municipio: 'Iztapalapa'},
      '10': {estado: 'Ciudad de México', municipio: 'Magdalena Contreras'},
      '11': {estado: 'Ciudad de México', municipio: 'Miguel Hidalgo'},
      '12': {estado: 'Ciudad de México', municipio: 'Milpa Alta'},
      '13': {estado: 'Ciudad de México', municipio: 'Tláhuac'},
      '14': {estado: 'Ciudad de México', municipio: 'Tlalpan'},
      '15': {estado: 'Ciudad de México', municipio: 'Venustiano Carranza'},
      '16': {estado: 'Ciudad de México', municipio: 'Xochimilco'},
      '20': {estado: 'Aguascalientes', municipio: 'Aguascalientes'},
      '22': {estado: 'Baja California', municipio: 'Tijuana'},
      '23': {estado: 'Baja California Sur', municipio: 'La Paz'},
      '24': {estado: 'Campeche', municipio: 'Campeche'},
      '25': {estado: 'Coahuila', municipio: 'Saltillo'},
      '26': {estado: 'Coahuila', municipio: 'Torreón'},
      '27': {estado: 'Coahuila', municipio: 'Monclova'},
      '28': {estado: 'Tamaulipas', municipio: 'Tampico'},
      '29': {estado: 'Chiapas', municipio: 'Tuxtla Gutiérrez'},
      '30': {estado: 'Veracruz', municipio: 'Xalapa'},
      '31': {estado: 'Yucatán', municipio: 'Mérida'},
      '32': {estado: 'Zacatecas', municipio: 'Zacatecas'},
      '33': {estado: 'Jalisco', municipio: 'Guadalajara'},
      '34': {estado: 'Durango', municipio: 'Durango'},
      '36': {estado: 'Guanajuato', municipio: 'León'},
      '37': {estado: 'Guanajuato', municipio: 'Guanajuato'},
      '38': {estado: 'Guanajuato', municipio: 'Celaya'},
      '39': {estado: 'Guerrero', municipio: 'Acapulco'},
      '40': {estado: 'Guerrero', municipio: 'Iguala'},
      '41': {estado: 'Guerrero', municipio: 'Chilpancingo'},
      '42': {estado: 'Hidalgo', municipio: 'Pachuca'},
      '43': {estado: 'Hidalgo', municipio: 'Tulancingo'},
      '44': {estado: 'Jalisco', municipio: 'Guadalajara'},
      '45': {estado: 'Jalisco', municipio: 'Zapopan'},
      '46': {estado: 'Jalisco', municipio: 'Lagos de Moreno'},
      '47': {estado: 'Jalisco', municipio: 'Puerto Vallarta'},
      '50': {estado: 'Estado de México', municipio: 'Toluca'},
      '52': {estado: 'Estado de México', municipio: 'Naucalpan'},
      '53': {estado: 'Estado de México', municipio: 'Tlalnepantla'},
      '54': {estado: 'Estado de México', municipio: 'Ecatepec'},
      '55': {estado: 'Estado de México', municipio: 'Nezahualcóyotl'},
      '58': {estado: 'Michoacán', municipio: 'Morelia'},
      '59': {estado: 'Michoacán', municipio: 'Uruapan'},
      '62': {estado: 'Morelos', municipio: 'Cuernavaca'},
      '63': {estado: 'Nayarit', municipio: 'Tepic'},
      '64': {estado: 'Nuevo León', municipio: 'Monterrey'},
      '65': {estado: 'Nuevo León', municipio: 'San Nicolás de los Garza'},
      '66': {estado: 'Nuevo León', municipio: 'Guadalupe'},
      '67': {estado: 'Nuevo León', municipio: 'Linares'},
      '68': {estado: 'Oaxaca', municipio: 'Oaxaca'},
      '72': {estado: 'Puebla', municipio: 'Puebla'},
      '73': {estado: 'Puebla', municipio: 'Tehuacán'},
      '76': {estado: 'Querétaro', municipio: 'Querétaro'},
      '77': {estado: 'Quintana Roo', municipio: 'Cancún'},
      '78': {estado: 'San Luis Potosí', municipio: 'San Luis Potosí'},
      '80': {estado: 'Sinaloa', municipio: 'Culiacán'},
      '81': {estado: 'Sinaloa', municipio: 'Los Mochis'},
      '82': {estado: 'Sinaloa', municipio: 'Mazatlán'},
      '83': {estado: 'Sonora', municipio: 'Hermosillo'},
      '84': {estado: 'Sonora', municipio: 'Nogales'},
      '85': {estado: 'Sonora', municipio: 'Ciudad Obregón'},
      '86': {estado: 'Tabasco', municipio: 'Villahermosa'},
    };
    
    const datosDireccion = estadosPorCP[firstDigits];
    
    if (datosDireccion) {
      this.proveedorForm.patchValue({
        estado: datosDireccion.estado,
        municipio: datosDireccion.municipio
      });
    }
  }

  guardarProveedor() {
    if (this.proveedorForm.invalid) {
      this.markFormGroupTouched(this.proveedorForm);
      return;
    }

    const formData = this.proveedorForm.value;
    
    // Los nombres ahora coinciden exactamente con el DTO del backend
    const proveedorData = {
      nombre: formData.nombre,
      razon_social: formData.razon_social,
      email: formData.email,
      telefono: formData.telefono,
      rfc: formData.rfc.toUpperCase(),
      regimen_fiscal: formData.regimen_fiscal,
      tipo_contribuyente: formData.tipo_contribuyente,
      Cpostal: formData.Cpostal,
      colonia: formData.colonia,
      calle: formData.calle,
      numero_ext: formData.numero_ext,
      numero_int: formData.numero_int || null,
      municipio: formData.municipio,
      estado: formData.estado,
      banco: formData.banco,
      cuenta_bancaria: formData.cuenta_bancaria,
      tipo_cuenta: formData.tipo_cuenta,
      clabe: formData.clabe || null,
      beneficiario: formData.beneficiario,
      limite_credito: Number(formData.limite_credito) || 0, // ✅ Convertir a número
      dias_credito: Number(formData.dias_credito) || 0,     // ✅ Convertir a número
      categoria: formData.categoria || null,
      notas: formData.notas || null
    };
    
    if (this.data && this.data.proveedor && this.data.proveedor.ID) {
      // Actualizar proveedor existente
      this.apibizService.updateProveedor(this.data.proveedor.ID, proveedorData).subscribe({
        next: (response) => {
          console.log('Proveedor actualizado con éxito', response);
          Swal.fire({
            icon: 'success',
            title: 'Proveedor actualizado',
            text: 'El proveedor se ha actualizado correctamente',
            confirmButtonText: 'Aceptar'
          });
          this.dialogRef.close(response);
        },
        error: (error) => {
          console.error('Error al actualizar proveedor', error);
          Swal.fire({
            icon: 'error',
            title: 'Error al actualizar',
            text: error.error?.message || 'No se pudo actualizar el proveedor',
            confirmButtonText: 'Aceptar'
          });
        }
      });
    } else {
      // Crear nuevo proveedor
      this.apibizService.createProveedor(proveedorData).subscribe({
        next: (response) => {
          console.log('Proveedor creado con éxito', response);
          Swal.fire({
            icon: 'success',
            title: 'Proveedor creado',
            text: 'El proveedor se ha creado correctamente',
            confirmButtonText: 'Aceptar'
          });
          this.dialogRef.close(response);
        },
        error: (error) => {
          console.error('Error al crear proveedor', error);
          Swal.fire({
            icon: 'error',
            title: 'Error al crear',
            text: error.error?.message || 'No se pudo crear el proveedor',
            confirmButtonText: 'Aceptar'
          });
        }
      });
    }
  }

  private markFormGroupTouched(formGroup: FormGroup) {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  // Getters para facilitar la validación en el template
  get nombre() { return this.proveedorForm.get('nombre'); }
  get razon_social() { return this.proveedorForm.get('razon_social'); }
  get email() { return this.proveedorForm.get('email'); }
  get telefono() { return this.proveedorForm.get('telefono'); }
  get tipo_contribuyente() { return this.proveedorForm.get('tipo_contribuyente'); }
  get rfc() { return this.proveedorForm.get('rfc'); }
  get regimen_fiscal() { return this.proveedorForm.get('regimen_fiscal'); }
  get calle() { return this.proveedorForm.get('calle'); }
  get numero_ext() { return this.proveedorForm.get('numero_ext'); }
  get banco() { return this.proveedorForm.get('banco'); }
  get cuenta_bancaria() { return this.proveedorForm.get('cuenta_bancaria'); }
  get clabe() { return this.proveedorForm.get('clabe'); }
  get limite_credito() { return this.proveedorForm.get('limite_credito'); }
  get dias_credito() { return this.proveedorForm.get('dias_credito'); }
}