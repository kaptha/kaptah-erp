import { Component, OnInit, Inject } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators, FormControl } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  TipoUbicacion,
  UbicacionCP,
  DomicilioCP,
  PATRONES_CP,
  generarIdUbicacion,
  calcularTotalDistRec,
  formatearFechaCfdi,
} from './carta-porte-31.model';

/** RFC sin distinguir mayusculas al capturar; se normaliza al construir el JSON */
const RFC_INPUT = new RegExp(PATRONES_CP.rfc.source, 'i');

@Component({
    selector: 'app-add-carta-porte-modal',
    templateUrl: './add-carta-porte-modal.component.html',
    styleUrls: ['./add-carta-porte-modal.component.css'],
    standalone: false
})
export class AddCartaPorteModalComponent implements OnInit {
  cartaPorteForm!: FormGroup;
  activeTab: string = 'General';
  loading: boolean = false;
  isEditing: boolean = false;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<AddCartaPorteModalComponent>,
    private snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  ngOnInit(): void {
    this.initForm();
    
    if (this.data?.cartaPorte) {
      this.isEditing = true;
      this.loadCartaPorteData(this.data.cartaPorte);
    }
  }

  initForm(): void {
    this.cartaPorteForm = this.fb.group({
      // Datos generales CFDI
      serie: ['CP', Validators.required],
      folio: ['', Validators.required],
      fecha: [new Date(), Validators.required],
      lugarExpedicion: ['', [Validators.required, Validators.pattern(/^\d{5}$/)]],
      
      // Emisor
      rfcEmisor: ['', Validators.required],
      nombreEmisor: ['', Validators.required],
      regimenFiscal: ['601', Validators.required],
      
      // Receptor
      rfcReceptor: ['', Validators.required],
      nombreReceptor: ['', Validators.required],
      usoCFDI: ['P01', Validators.required],
      
      // Complemento Carta Porte
      transpInternac: ['No', Validators.required],
      entradaSalidaMerc: [''],
      totalDistRec: [0],
      
      // Mercancías
      pesoBrutoTotal: [0, [Validators.required, Validators.min(0.01)]],
      unidadPeso: ['KGM', Validators.required],
      pesoNetoTotal: [0, [Validators.required, Validators.min(0.01)]],
      numTotalMercancias: [0],
      cargoPorTasacion: [0],
      
      // Tipo de transporte
      tipoTransporte: ['', Validators.required],
      
      // Figura transporte
      cveTransporte: ['04', Validators.required],
      rfcNotificado: [''],
      
      // Arrays dinámicos
      ubicaciones: this.fb.array([]),
      mercancias: this.fb.array([]),
      
      // Grupos condicionales por tipo de transporte
      autotransporteFederal: this.fb.group({
        permSCT: [''],
        numPermisoSCT: [''],
        identificacionVehicular: this.fb.group({
          configVehicular: [''],
          placaVM: [''],
          anioModeloVM: ['']
        }),
        remolques: this.fb.array([])
      }),
      
      transporteFerroviario: this.fb.group({
        tipoDeServicio: [''],
        carros: this.fb.array([])
      }),
      
      transporteMaritimo: this.fb.group({
        tipoEmbarcacion: [''],
        matricula: [''],
        numeroOMI: ['']
      }),
      
      transporteAereo: this.fb.group({
        permSCT: [''],
        numPermisoSCT: [''],
        matriculaAeronave: ['']
      })
    });
    
    // Ubicaciones mínimas: un Origen y un Destino (Carta Porte 3.1)
    this.getUbicaciones().push(this.createUbicacion('Origen'));
    this.getUbicaciones().push(this.createUbicacion('Destino'));
    this.renumerarUbicaciones();

    // La distancia total se recalcula con cualquier cambio en ubicaciones
    this.getUbicaciones().valueChanges.subscribe(() => this.calcularDistanciaTotal());
    
    // Inicializar con una mercancía por defecto
    this.addMercancia();
  }

  // ===== GESTIÓN DE TABS =====
  changeTab(tab: string): void {
    this.activeTab = tab;
  }

  // ===== VALIDACIONES =====
  isInvalid(fieldName: string): boolean {
    const field = this.cartaPorteForm.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  // ===== UBICACIONES =====
  getUbicaciones(): FormArray {
    return this.cartaPorteForm.get('ubicaciones') as FormArray;
  }

  /** Ubicacion Carta Porte 3.1: TipoUbicacion + IDUbicacion + RFC + fecha/hora + domicilio */
  createUbicacion(tipo: TipoUbicacion): FormGroup {
    const esDestino = tipo === 'Destino';

    return this.fb.group({
      tipoUbicacion: [tipo, Validators.required],
      idUbicacion: [''], // lo asigna renumerarUbicaciones()
      rfcRemitenteDestinatario: ['', [Validators.required, Validators.pattern(RFC_INPUT)]],
      nombreRemitenteDestinatario: [''],
      fechaHoraSalidaLlegada: ['', Validators.required],
      // Solo los destinos llevan distancia recorrida
      distanciaRecorrida: [null, esDestino ? [Validators.required, Validators.min(0.01)] : []],

      // En autotransporte el domicilio es obligatorio: Estado, Pais y CP requeridos
      domicilio: this.fb.group({
        calle: [''],
        numeroExterior: [''],
        numeroInterior: [''],
        colonia: [''],    // clave c_Colonia
        localidad: [''],  // clave c_Localidad
        municipio: [''],  // clave c_Municipio
        referencia: [''],
        estado: ['', Validators.required],
        pais: ['MEX', Validators.required],
        codigoPostal: ['', [Validators.required, Validators.pattern(PATRONES_CP.codigoPostal)]]
      })
    });
  }

  esOrigen(index: number): boolean {
    return this.getUbicaciones().at(index)?.get('tipoUbicacion')?.value === 'Origen';
  }

  private contarDestinos(): number {
    return this.getUbicaciones().controls
      .filter(c => c.get('tipoUbicacion')?.value === 'Destino').length;
  }

  /** Solo se pueden eliminar destinos, y siempre debe quedar al menos uno */
  puedeEliminarUbicacion(index: number): boolean {
    return !this.esOrigen(index) && this.contarDestinos() > 1;
  }

  /** Cada parada adicional es un Destino más (en 3.1 ya no existe "punto intermedio") */
  addDestino(): void {
    this.getUbicaciones().push(this.createUbicacion('Destino'));
    this.renumerarUbicaciones();
  }

  removeUbicacion(index: number): void {
    if (!this.puedeEliminarUbicacion(index)) return;
    const idEliminado = this.getUbicaciones().at(index).get('idUbicacion')?.value;
    this.getUbicaciones().removeAt(index);
    this.renumerarUbicaciones(idEliminado);
  }

  /**
   * Asigna IDs consecutivos (OR000001, DE000001, DE000002...) y actualiza
   * las referencias de CantidadTransporta: los IDs renumerados se reasignan
   * y los que apuntaban a la ubicacion eliminada se limpian.
   */
  renumerarUbicaciones(idEliminado?: string): void {
    let origenes = 0;
    let destinos = 0;
    const mapa = new Map<string, string>();

    this.getUbicaciones().controls.forEach(c => {
      const tipo = c.get('tipoUbicacion')?.value as TipoUbicacion;
      const anterior: string = c.get('idUbicacion')?.value || '';
      const nuevo = generarIdUbicacion(tipo, tipo === 'Origen' ? ++origenes : ++destinos);
      if (anterior && anterior !== nuevo) mapa.set(anterior, nuevo);
      c.get('idUbicacion')?.setValue(nuevo, { emitEvent: false });
    });

    const remap = (id: string): string =>
      !id ? '' : id === idEliminado ? '' : (mapa.get(id) ?? id);

    this.getMercancias().controls.forEach(m => {
      (m.get('cantidadTransporta') as FormArray).controls.forEach(ct => {
        ct.patchValue({
          idOrigen: remap(ct.get('idOrigen')?.value),
          idDestino: remap(ct.get('idDestino')?.value)
        }, { emitEvent: false });
      });
    });
  }

  /** IDs disponibles para los selects de CantidadTransporta */
  getIdsUbicacion(tipo: TipoUbicacion): string[] {
    return this.getUbicaciones().controls
      .filter(c => c.get('tipoUbicacion')?.value === tipo)
      .map(c => c.get('idUbicacion')?.value as string);
  }

  /** TotalDistRec = suma de DistanciaRecorrida de los destinos */
  calcularDistanciaTotal(): void {
    const total = calcularTotalDistRec(this.buildUbicaciones(this.getUbicaciones().getRawValue()));
    this.cartaPorteForm.patchValue({ totalDistRec: total }, { emitEvent: false });
  }

  // ===== MERCANCÍAS =====
  getMercancias(): FormArray {
    return this.cartaPorteForm.get('mercancias') as FormArray;
  }

  createMercancia(): FormGroup {
    return this.fb.group({
      pesoEnKg: [0, [Validators.required, Validators.min(0.001)]],
      descripcion: [''],
      cantidadTransporta: this.fb.array([this.createCantidadTransporta()])
    });
  }

  addMercancia(): void {
    this.getMercancias().push(this.createMercancia());
    this.updateNumTotalMercancias();
  }

  removeMercancia(index: number): void {
    if (this.getMercancias().length > 1) {
      this.getMercancias().removeAt(index);
      this.updateNumTotalMercancias();
    }
  }

  updateNumTotalMercancias(): void {
    this.cartaPorteForm.patchValue({
      numTotalMercancias: this.getMercancias().length
    });
  }

  // ===== CANTIDAD TRANSPORTA =====
  getCantidadTransporta(mercanciaIndex: number): FormArray {
    return this.getMercancias().at(mercanciaIndex).get('cantidadTransporta') as FormArray;
  }

  createCantidadTransporta(): FormGroup {
    return this.fb.group({
      cantidad: [1, [Validators.required, Validators.min(0.01)]],
      idOrigen: ['', Validators.required],
      idDestino: ['', Validators.required]
    });
  }

  addCantidadTransporta(mercanciaIndex: number): void {
    this.getCantidadTransporta(mercanciaIndex).push(this.createCantidadTransporta());
  }

  removeCantidadTransporta(mercanciaIndex: number, ctIndex: number): void {
    if (this.getCantidadTransporta(mercanciaIndex).length > 1) {
      this.getCantidadTransporta(mercanciaIndex).removeAt(ctIndex);
    }
  }

  // ===== TRANSPORTE =====
  onTipoTransporteChange(event: any): void {
    const tipo = event.value;
    
    // Resetear todos los grupos de transporte
    this.resetTransporteGroups();
    
    // Inicializar el grupo correspondiente según el tipo
    switch(tipo) {
      case '01': // Autotransporte
        this.initAutotransporte();
        break;
      case '04': // Ferroviario
        this.initTransporteFerroviario();
        break;
      case '02': // Marítimo
      case '03': // Aéreo
        // Ya están inicializados
        break;
    }
  }

  resetTransporteGroups(): void {
    // Limpiar arrays de remolques y carros
    (this.cartaPorteForm.get('autotransporteFederal.remolques') as FormArray).clear();
    (this.cartaPorteForm.get('transporteFerroviario.carros') as FormArray).clear();
  }

  initAutotransporte(): void {
    this.addRemolque();
  }

  initTransporteFerroviario(): void {
    this.addCarro();
  }

  // ===== REMOLQUES (Autotransporte) =====
  getRemolques(): FormArray {
    return this.cartaPorteForm.get('autotransporteFederal.remolques') as FormArray;
  }

  createRemolque(): FormGroup {
    return this.fb.group({
      subTipoRem: [''],
      placa: ['']
    });
  }

  addRemolque(): void {
    this.getRemolques().push(this.createRemolque());
  }

  removeRemolque(index: number): void {
    if (this.getRemolques().length > 1) {
      this.getRemolques().removeAt(index);
    }
  }

  // ===== CARROS FERROVIARIOS =====
  getCarros(): FormArray {
    return this.cartaPorteForm.get('transporteFerroviario.carros') as FormArray;
  }

  createCarro(): FormGroup {
    return this.fb.group({
      tipoCarro: [''],
      matriculaCarro: [''],
      guiaCarro: [''],
      toneladasNetasCarro: [0],
      contenedores: this.fb.array([this.createContenedor()])
    });
  }

  addCarro(): void {
    this.getCarros().push(this.createCarro());
  }

  removeCarro(index: number): void {
    if (this.getCarros().length > 1) {
      this.getCarros().removeAt(index);
    }
  }

  // ===== CONTENEDORES (Ferroviario) =====
  getContenedores(carroIndex: number): FormArray {
    return this.getCarros().at(carroIndex).get('contenedores') as FormArray;
  }

  createContenedor(): FormGroup {
    return this.fb.group({
      tipoContenedor: [''],
      pesoContenedorVacio: [0],
      pesoNetoMercancia: [0]
    });
  }

  addContenedor(carroIndex: number): void {
    this.getContenedores(carroIndex).push(this.createContenedor());
  }

  removeContenedor(carroIndex: number, contenedorIndex: number): void {
    if (this.getContenedores(carroIndex).length > 1) {
      this.getContenedores(carroIndex).removeAt(contenedorIndex);
    }
  }

  // ===== GENERACIÓN DE JSON =====
  generateJSON(): any {
    const formValue = this.cartaPorteForm.value;
    
    // Construir el JSON en el formato del XML analizado
    const json = {
      cfdi: {
        version: "3.3",
        serie: formValue.serie,
        folio: formValue.folio,
        fecha: this.formatDateTime(formValue.fecha),
        tipoDeComprobante: "T",
        lugarExpedicion: formValue.lugarExpedicion,
        subTotal: "0",
        moneda: "XXX",
        total: "0",
        
        emisor: {
          rfc: formValue.rfcEmisor,
          nombre: formValue.nombreEmisor,
          regimenFiscal: formValue.regimenFiscal
        },
        
        receptor: {
          rfc: formValue.rfcReceptor,
          nombre: formValue.nombreReceptor,
          usoCFDI: formValue.usoCFDI
        },
        
        conceptos: this.buildConceptos(formValue),
        
        complemento: {
          cartaPorte: this.buildCartaPorte(formValue)
        }
      }
    };
    
    return json;
  }

  buildConceptos(formValue: any): any[] {
    // Por ahora conceptos básicos, puedes expandir esto
    return [{
      claveProdServ: "78101800",
      cantidad: "1.00",
      claveUnidad: "E48",
      unidad: "SERVICIO",
      descripcion: "Servicio de transporte de carga",
      valorUnitario: "0",
      importe: "0"
    }];
  }

  buildCartaPorte(formValue: any): any {
    const cartaPorte: any = {
      version: "1.0",
      transpInternac: formValue.transpInternac,
      totalDistRec: formValue.totalDistRec
    };
    
    if (formValue.transpInternac === 'Sí' && formValue.entradaSalidaMerc) {
      cartaPorte.entradaSalidaMerc = formValue.entradaSalidaMerc;
    }
    
    // Ubicaciones
    cartaPorte.ubicaciones = this.buildUbicaciones(formValue.ubicaciones);
    
    // Mercancías
    cartaPorte.mercancias = this.buildMercancias(formValue);
    
    // Figura Transporte
    cartaPorte.figuraTransporte = {
      cveTransporte: formValue.cveTransporte
    };
    
    if (formValue.rfcNotificado) {
      cartaPorte.figuraTransporte.notificado = {
        rfcNotificado: formValue.rfcNotificado
      };
    }
    
    return cartaPorte;
  }

  /** Convierte el FormArray al formato Ubicacion de Carta Porte 3.1 */
  buildUbicaciones(ubicaciones: any[]): UbicacionCP[] {
    return ubicaciones.map(ub => {
      const d = ub.domicilio || {};
      const domicilio: DomicilioCP = {
        Estado: d.estado,
        Pais: d.pais,
        CodigoPostal: d.codigoPostal
      };
      const opcionales: [keyof DomicilioCP, string][] = [
        ['Calle', d.calle],
        ['NumeroExterior', d.numeroExterior],
        ['NumeroInterior', d.numeroInterior],
        ['Colonia', d.colonia],
        ['Localidad', d.localidad],
        ['Referencia', d.referencia],
        ['Municipio', d.municipio]
      ];
      opcionales.forEach(([campo, valor]) => {
        const limpio = (valor ?? '').toString().trim();
        if (limpio) domicilio[campo] = limpio;
      });

      const ubicacion: UbicacionCP = {
        TipoUbicacion: ub.tipoUbicacion,
        IDUbicacion: ub.idUbicacion,
        RFCRemitenteDestinatario: (ub.rfcRemitenteDestinatario || '').trim().toUpperCase(),
        FechaHoraSalidaLlegada: ub.fechaHoraSalidaLlegada ? formatearFechaCfdi(ub.fechaHoraSalidaLlegada) : '',
        Domicilio: domicilio
      };

      const nombre = (ub.nombreRemitenteDestinatario || '').trim();
      if (nombre) ubicacion.NombreRemitenteDestinatario = nombre;

      if (ub.tipoUbicacion === 'Destino') {
        ubicacion.DistanciaRecorrida = Number(ub.distanciaRecorrida) || 0;
      }

      return ubicacion;
    });
  }

  buildMercancias(formValue: any): any {
    const mercancias: any = {
      pesoBrutoTotal: formValue.pesoBrutoTotal,
      unidadPeso: formValue.unidadPeso,
      pesoNetoTotal: formValue.pesoNetoTotal,
      numTotalMercancias: formValue.numTotalMercancias,
      cargoPorTasacion: formValue.cargoPorTasacion || 0,
      mercancia: formValue.mercancias.map((m: any) => ({
        pesoEnKg: m.pesoEnKg,
        descripcion: m.descripcion,
        cantidadTransporta: m.cantidadTransporta
      }))
    };
    
    // Agregar tipo de transporte específico
    switch(formValue.tipoTransporte) {
      case '01': // Autotransporte
        mercancias.autotransporteFederal = this.buildAutotransporte(formValue.autotransporteFederal);
        break;
      case '04': // Ferroviario
        mercancias.transporteFerroviario = this.buildTransporteFerroviario(formValue.transporteFerroviario);
        break;
      case '02': // Marítimo
        mercancias.transporteMaritimo = formValue.transporteMaritimo;
        break;
      case '03': // Aéreo
        mercancias.transporteAereo = formValue.transporteAereo;
        break;
    }
    
    return mercancias;
  }

  buildAutotransporte(autotransporte: any): any {
    return {
      permSCT: autotransporte.permSCT,
      numPermisoSCT: autotransporte.numPermisoSCT,
      identificacionVehicular: autotransporte.identificacionVehicular,
      remolques: autotransporte.remolques
    };
  }

  buildTransporteFerroviario(transporteFerroviario: any): any {
    return {
      tipoDeServicio: transporteFerroviario.tipoDeServicio,
      carro: transporteFerroviario.carros
    };
  }

  formatDateTime(date: any): string {
    if (!date) return '';
    
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
  }

  // ===== ACCIONES =====
  onPreview(): void {
    const json = this.generateJSON();
    
    // Mostrar JSON en consola para debug
    console.log('JSON Generado:', JSON.stringify(json, null, 2));
    
    // Mostrar en un diálogo o descargar
    this.snackBar.open('JSON generado. Revisa la consola del navegador.', 'OK', {
      duration: 5000
    });
    
    // Opcionalmente descargar el JSON
    this.downloadJSON(json);
  }

  downloadJSON(json: any): void {
    const dataStr = JSON.stringify(json, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `carta-porte-${Date.now()}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  }

  onSubmit(): void {
    if (this.cartaPorteForm.valid) {
      this.loading = true;
      
      const json = this.generateJSON();
      
      // Aquí enviarías el JSON a tu backend
      // Por ahora solo cerramos el diálogo con el JSON
      setTimeout(() => {
        this.loading = false;
        this.dialogRef.close({ success: true, data: json });
      }, 1000);
    } else {
      this.snackBar.open('Por favor completa todos los campos requeridos', 'OK', {
        duration: 3000
      });
      this.markFormGroupTouched(this.cartaPorteForm);
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  markFormGroupTouched(formGroup: FormGroup | FormArray): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();

      if (control instanceof FormGroup || control instanceof FormArray) {
        this.markFormGroupTouched(control);
      }
    });
  }

  loadCartaPorteData(data: any): void {
    // Implementar carga de datos para edición
    // this.cartaPorteForm.patchValue(data);
  }
}