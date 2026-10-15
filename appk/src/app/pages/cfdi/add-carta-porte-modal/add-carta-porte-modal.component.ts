import { Component, OnInit, OnDestroy, Inject } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators, FormControl } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { UsersService } from '../../../services/users.service';
import { ApibizService } from '../../../services/apibiz.service';
import { SucursalesService } from '../../../services/sucursales.service';
import { ProductService } from '../../../services/inventory/product.service';
import {
  TipoUbicacion,
  TipoComprobanteCP,
  UbicacionCP,
  DomicilioCP,
  ConceptoCP,
  MercanciaCP,
  AutotransporteCP,
  TipoFiguraCP,
  CfdiCartaPorte,
  PATRONES_CP,
  TRASLADO_DEFAULTS,
  INGRESO_TRANSPORTISTA_DEFAULTS,
  generarIdUbicacion,
  generarIdCCP,
  calcularTotalDistRec,
  calcularPesoBrutoTotal,
  validarCartaPorte,
  MAX_REMOLQUES,
  formatearFechaCfdi,
} from './carta-porte-31.model';

/** RFC sin distinguir mayusculas al capturar; se normaliza al construir el JSON */
const RFC_INPUT = new RegExp(PATRONES_CP.rfc.source, 'i');

/** Regimenes del receptor que aceptan G01/G03 (c_UsoCFDI) */
const REG_GASTOS = ['601', '603', '606', '612', '620', '621', '622', '623', '624', '625', '626'];

const RFC_GENERICOS = ['XAXX010101000', 'XEXX010101000'];

function redondear2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** c_TipoPermiso (autotransporte) mas usados */
const PERMISOS_SCT: { clave: string; nombre: string }[] = [
  { clave: 'TPAF01', nombre: 'Autotransporte federal de carga general' },
  { clave: 'TPAF02', nombre: 'Transporte privado de carga' },
  { clave: 'TPAF03', nombre: 'Carga especializada de materiales y residuos peligrosos' },
  { clave: 'TPAF07', nombre: 'Transporte privado de materiales y residuos peligrosos' },
  { clave: 'TPXX00', nombre: 'Permiso no contemplado en el catálogo' }
];

/** c_ConfigAutotransporte mas usados (R = remolque, S = semirremolque) */
const CONFIG_VEHICULAR: { clave: string; nombre: string }[] = [
  { clave: 'VL', nombre: 'Vehículo ligero de carga' },
  { clave: 'C2', nombre: 'Camión unitario 2 ejes' },
  { clave: 'C3', nombre: 'Camión unitario 3 ejes' },
  { clave: 'C2R2', nombre: 'Camión-remolque 6 ejes' },
  { clave: 'C3R2', nombre: 'Camión-remolque 5 ejes' },
  { clave: 'C3R3', nombre: 'Camión-remolque 6 ejes' },
  { clave: 'T2S1', nombre: 'Tractocamión articulado 3 ejes' },
  { clave: 'T2S2', nombre: 'Tractocamión articulado 4 ejes' },
  { clave: 'T3S2', nombre: 'Tractocamión articulado 5 ejes' },
  { clave: 'T3S3', nombre: 'Tractocamión articulado 6 ejes' },
  { clave: 'T3S2R4', nombre: 'Tractocamión doblemente articulado 9 ejes' }
];

/** c_SubTipoRem */
const SUBTIPOS_REMOLQUE: { clave: string; nombre: string }[] = [
  { clave: 'CTR002', nombre: 'Caja' },
  { clave: 'CTR004', nombre: 'Caja cerrada' },
  { clave: 'CTR006', nombre: 'Caja refrigerada' },
  { clave: 'CTR007', nombre: 'Caja seca' },
  { clave: 'CTR009', nombre: 'Cama baja o cuello ganso' },
  { clave: 'CTR010', nombre: 'Chasis portacontenedor' },
  { clave: 'CTR013', nombre: 'Estacas' },
  { clave: 'CTR021', nombre: 'Plataforma' },
  { clave: 'CTR024', nombre: 'Redilas' },
  { clave: 'CTR028', nombre: 'Tanque' },
  { clave: 'CTR029', nombre: 'Tolva' },
  { clave: 'CTR031', nombre: 'Volteo' }
];

/** c_ParteTransporte para Propietario/Arrendador (autotransporte) */
const PARTES_TRANSPORTE: { clave: string; nombre: string }[] = [
  { clave: 'PT01', nombre: 'Camión unitario' },
  { clave: 'PT02', nombre: 'Tractocamión' },
  { clave: 'PT03', nombre: 'Remolque' },
  { clave: 'PT04', nombre: 'Semirremolque' },
  { clave: 'PT05', nombre: 'Vehículo ligero de carga' }
];

/** La configuracion lleva remolque/semirremolque si despues del primer caracter hay R o S */
function requiereRemolque(config: string): boolean {
  return /^[A-Z][0-9](?:.*[RS])/.test((config || '').toUpperCase());
}

/** Unidades frecuentes para mercancias (c_ClaveUnidad) */
const UNIDADES_MERCANCIA: { clave: string; nombre: string }[] = [
  { clave: 'H87', nombre: 'Pieza' },
  { clave: 'KGM', nombre: 'Kilogramo' },
  { clave: 'XBX', nombre: 'Caja' },
  { clave: 'XPK', nombre: 'Paquete' },
  { clave: 'LTR', nombre: 'Litro' },
  { clave: 'TNE', nombre: 'Tonelada' },
  { clave: 'MTR', nombre: 'Metro' },
  { clave: 'MTK', nombre: 'Metro cuadrado' }
];

@Component({
    selector: 'app-add-carta-porte-modal',
    templateUrl: './add-carta-porte-modal.component.html',
    styleUrls: ['./add-carta-porte-modal.component.css'],
    standalone: false
})
export class AddCartaPorteModalComponent implements OnInit, OnDestroy {
  cartaPorteForm!: FormGroup;
  activeTab: string = 'General';
  loading: boolean = false;
  isEditing: boolean = false;

  private destroy$ = new Subject<void>();

  /** Identificador del complemento; uno por CFDI */
  readonly idCCP: string = generarIdCCP();

  // Datos de apoyo para la pestana General
  clientes: any[] = [];
  productos: any[] = [];
  readonly unidadesMercancia = UNIDADES_MERCANCIA;
  readonly permisosSCT = PERMISOS_SCT;
  readonly configuracionesVehiculares = CONFIG_VEHICULAR;
  readonly subtiposRemolque = SUBTIPOS_REMOLQUE;
  readonly partesTransporte = PARTES_TRANSPORTE;
  readonly maxRemolques = MAX_REMOLQUES;
  hayMaterialPeligroso = false;
  erroresValidacion: string[] = [];
  sucursales: any[] = [];
  emisorCargado = false;
  emisorEditable = false;
  private cpEmisor = '';

  readonly regimenesFiscales = [
    { clave: '601', descripcion: 'General de Ley Personas Morales' },
    { clave: '603', descripcion: 'Personas Morales con Fines no Lucrativos' },
    { clave: '605', descripcion: 'Sueldos y Salarios e Ingresos Asimilados a Salarios' },
    { clave: '606', descripcion: 'Arrendamiento' },
    { clave: '607', descripcion: 'Régimen de Enajenación o Adquisición de Bienes' },
    { clave: '608', descripcion: 'Demás ingresos' },
    { clave: '610', descripcion: 'Residentes en el Extranjero sin Establecimiento Permanente en México' },
    { clave: '611', descripcion: 'Ingresos por Dividendos (socios y accionistas)' },
    { clave: '612', descripcion: 'Personas Físicas con Actividades Empresariales y Profesionales' },
    { clave: '614', descripcion: 'Ingresos por intereses' },
    { clave: '615', descripcion: 'Régimen de los ingresos por obtención de premios' },
    { clave: '616', descripcion: 'Sin obligaciones fiscales' },
    { clave: '620', descripcion: 'Sociedades Cooperativas de Producción que optan por diferir sus ingresos' },
    { clave: '621', descripcion: 'Incorporación Fiscal' },
    { clave: '622', descripcion: 'Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras' },
    { clave: '623', descripcion: 'Opcional para Grupos de Sociedades' },
    { clave: '624', descripcion: 'Coordinados' },
    { clave: '625', descripcion: 'Actividades Empresariales con ingresos a través de Plataformas Tecnológicas' },
    { clave: '626', descripcion: 'Régimen Simplificado de Confianza' }
  ];

  /** Usos validos para el CFDI de Ingreso de un flete (filtrados por regimen del receptor) */
  private readonly usosIngreso: { codigo: string; nombre: string; regimenes: string[] | null }[] = [
    { codigo: 'G03', nombre: 'Gastos en general', regimenes: REG_GASTOS },
    { codigo: 'G01', nombre: 'Adquisición de mercancías', regimenes: REG_GASTOS },
    { codigo: 'S01', nombre: 'Sin efectos fiscales', regimenes: null }
  ];

  readonly formasPago = [
    { codigo: '01', nombre: 'Efectivo' },
    { codigo: '02', nombre: 'Cheque nominativo' },
    { codigo: '03', nombre: 'Transferencia electrónica de fondos' },
    { codigo: '04', nombre: 'Tarjeta de crédito' },
    { codigo: '28', nombre: 'Tarjeta de débito' },
    { codigo: '99', nombre: 'Por definir' }
  ];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<AddCartaPorteModalComponent>,
    private snackBar: MatSnackBar,
    private usersService: UsersService,
    private apibizService: ApibizService,
    private sucursalesService: SucursalesService,
    private productService: ProductService,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.setTipoComprobante('T');
    this.setupGeneralSync();
    this.cargarEmisor();
    this.cargarClientes();
    this.cargarSucursales();
    this.cargarProductos();

    if (this.data?.cartaPorte) {
      this.isEditing = true;
      this.loadCartaPorteData(this.data.cartaPorte);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  initForm(): void {
    this.cartaPorteForm = this.fb.group({
      // ===== CFDI 4.0 =====
      // T = Traslado (mercancia propia, valor 0) | I = Ingreso (transportista que cobra el flete)
      tipoDeComprobante: ['T', Validators.required],
      sucursalId: [null],
      serie: ['CP'],
      folio: [''],
      lugarExpedicion: ['', [Validators.required, Validators.pattern(PATRONES_CP.codigoPostal)]],

      // Emisor: se llena desde el perfil fiscal
      rfcEmisor: ['', [Validators.required, Validators.pattern(RFC_INPUT)]],
      nombreEmisor: ['', Validators.required],
      regimenFiscal: ['', Validators.required],

      // Receptor: en Traslado es el propio emisor; en Ingreso es el cliente
      clienteId: [null],
      rfcReceptor: ['', [Validators.required, Validators.pattern(RFC_INPUT)]],
      nombreReceptor: ['', Validators.required],
      regimenFiscalReceptor: ['', Validators.required],
      domicilioFiscalReceptor: ['', [Validators.required, Validators.pattern(PATRONES_CP.codigoPostal)]],
      usoCFDI: [TRASLADO_DEFAULTS.UsoCFDI, Validators.required],

      // Solo Ingreso: cobro del flete (validadores en setTipoComprobante)
      formaPago: ['03'],
      metodoPago: ['PUE'],
      descripcionServicio: ['Servicio de transporte de carga'],
      valorFlete: [null],
      aplicaRetencionIVA: [false],

      // Complemento Carta Porte
      transpInternac: ['No', Validators.required],
      entradaSalidaMerc: [''],
      totalDistRec: [0],
      
      // Mercancías
      // PesoBrutoTotal y NumTotalMercancias se calculan de las mercancias
      pesoBrutoTotal: [0],
      unidadPeso: ['KGM', Validators.required],
      pesoNetoTotal: [null, Validators.min(0)],
      numTotalMercancias: [0],
      cargoPorTasacion: [0],
      
      // Tipo de transporte (fase 1: solo 01 Autotransporte)
      tipoTransporte: ['01', Validators.required],

      // FiguraTransporte 3.1: en autotransporte es obligatorio al menos un Operador (01)
      figuras: this.fb.array([]),

      // Arrays dinámicos
      ubicaciones: this.fb.array([]),
      mercancias: this.fb.array([]),
      
      // Grupos condicionales por tipo de transporte
      autotransporte: this.fb.group({
        permSCT: ['TPAF01', Validators.required],
        numPermisoSCT: ['', Validators.required],
        identificacionVehicular: this.fb.group({
          configVehicular: ['', Validators.required],
          pesoBrutoVehicular: [null as number | null, [Validators.required, Validators.min(0.01)]],  // toneladas
          placaVM: ['', [Validators.required, Validators.pattern(/^[A-Za-z0-9]{5,7}$/)]],
          anioModeloVM: [null as number | null, [Validators.required, Validators.min(1900), Validators.max(new Date().getFullYear() + 1)]]
        }),
        seguros: this.fb.group({
          aseguraRespCivil: ['', Validators.required],
          polizaRespCivil: ['', Validators.required],
          aseguraMedAmbiente: [''],   // obligatorio si hay material peligroso
          polizaMedAmbiente: [''],
          aseguraCarga: [''],
          polizaCarga: [''],
          primaSeguro: [null as number | null, Validators.min(0)]
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
    
    // Inicializar con una mercancía por defecto; peso bruto y número total se recalculan solos
    this.addMercancia();
    this.getMercancias().valueChanges.subscribe(() => this.recalcularMercancias());
    this.recalcularMercancias();

    // FiguraTransporte: inicia con el Operador obligatorio
    this.addFigura('01');

    // La configuracion vehicular decide si hay remolques
    this.cartaPorteForm.get('autotransporte.identificacionVehicular.configVehicular')?.valueChanges
      .subscribe((config: string) => this.ajustarRemolques(config));
  }

  // ===== PESTAÑA GENERAL (CFDI 4.0) =====
  get esTraslado(): boolean {
    return this.cartaPorteForm.get('tipoDeComprobante')?.value === 'T';
  }

  get esIngreso(): boolean {
    return this.cartaPorteForm.get('tipoDeComprobante')?.value === 'I';
  }

  /** Cambia entre Traslado e Ingreso y ajusta receptor, uso CFDI y validadores */
  setTipoComprobante(tipo: TipoComprobanteCP): void {
    const f = this.cartaPorteForm;
    f.patchValue({ tipoDeComprobante: tipo, clienteId: null }, { emitEvent: false });

    const requeridosIngreso: { [k: string]: any[] } = {
      formaPago: [Validators.required],
      metodoPago: [Validators.required],
      descripcionServicio: [Validators.required],
      valorFlete: [Validators.required, Validators.min(0.01)]
    };
    Object.keys(requeridosIngreso).forEach(campo => {
      const c = f.get(campo);
      if (tipo === 'I') c?.setValidators(requeridosIngreso[campo]); else c?.clearValidators();
      c?.updateValueAndValidity({ emitEvent: false });
    });

    if (tipo === 'I') {
      f.patchValue({
        rfcReceptor: '', nombreReceptor: '', regimenFiscalReceptor: '',
        domicilioFiscalReceptor: '', usoCFDI: 'G03', aplicaRetencionIVA: false
      }, { emitEvent: false });
    } else {
      f.patchValue({ usoCFDI: TRASLADO_DEFAULTS.UsoCFDI }, { emitEvent: false });
      this.sincronizarReceptorTraslado();
    }
    f.updateValueAndValidity();
  }

  /** En Traslado el receptor es el mismo contribuyente que emite */
  private sincronizarReceptorTraslado(): void {
    if (!this.esTraslado) return;
    const f = this.cartaPorteForm;
    const cpActual = f.get('domicilioFiscalReceptor')?.value;
    f.patchValue({
      rfcReceptor: f.get('rfcEmisor')?.value || '',
      nombreReceptor: f.get('nombreEmisor')?.value || '',
      regimenFiscalReceptor: f.get('regimenFiscal')?.value || '',
      domicilioFiscalReceptor: this.cpEmisor || cpActual || '',
      usoCFDI: TRASLADO_DEFAULTS.UsoCFDI
    }, { emitEvent: false });
  }

  private setupGeneralSync(): void {
    const f = this.cartaPorteForm;

    // Si el emisor cambia (captura manual), el receptor del Traslado lo sigue
    ['rfcEmisor', 'nombreEmisor', 'regimenFiscal'].forEach(campo =>
      f.get(campo)?.valueChanges.pipe(takeUntil(this.destroy$))
        .subscribe(() => this.sincronizarReceptorTraslado()));

    // El uso CFDI debe ser compatible con el regimen del receptor
    f.get('regimenFiscalReceptor')?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe(() => this.ajustarUsoCfdi());

    // Pago en parcialidades o diferido (PPD) => forma de pago 99
    f.get('metodoPago')?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe(metodo => {
        if (metodo === 'PPD') f.get('formaPago')?.setValue('99', { emitEvent: false });
      });
  }

  get usosDisponibles(): { codigo: string; nombre: string }[] {
    if (this.esTraslado) return [{ codigo: 'S01', nombre: 'Sin efectos fiscales' }];
    const reg = this.cartaPorteForm.get('regimenFiscalReceptor')?.value;
    return this.usosIngreso.filter(u => !u.regimenes || !reg || u.regimenes.includes(reg));
  }

  private ajustarUsoCfdi(): void {
    if (!this.esIngreso) return;
    const uso = this.cartaPorteForm.get('usoCFDI');
    const permitidos = this.usosDisponibles.map(u => u.codigo);
    if (!permitidos.includes(uso?.value)) {
      uso?.setValue(permitidos[0] || 'S01', { emitEvent: false });
    }
  }

  getRegimenDescripcion(clave: string): string {
    const r = this.regimenesFiscales.find(x => x.clave === clave);
    return r ? `${r.clave} - ${r.descripcion}` : (clave || '—');
  }

  // --- Emisor (perfil fiscal) ---
  private cargarEmisor(): void {
    const uid = localStorage.getItem('activeCuentaUid');
    if (!uid) {
      this.aplicarEmisor(this.leerUsuarioLocal());
      return;
    }
    this.usersService.getUserFromMySQL(uid)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (user: any) => this.aplicarEmisor(user || this.leerUsuarioLocal()),
        error: (err: any) => {
          console.error('Carta Porte: error cargando emisor', err);
          this.aplicarEmisor(this.leerUsuarioLocal());
        }
      });
  }

  private leerUsuarioLocal(): any {
    try {
      return JSON.parse(localStorage.getItem('user') || 'null') || {};
    } catch {
      return {};
    }
  }

  private aplicarEmisor(u: any): void {
    const texto = (v: any) => (v ?? '').toString().trim();
    const rfc = texto(u.rfc || u.Rfc || u.RFC).toUpperCase();
    const nombre = texto(u.nombre || u.Nombre || u.nombreComercial || u.NombreComercial);
    const regimen = texto(u.fiscalReg || u.FiscalReg || u.regimenFiscal || u.RegimenFiscal || u.RegFiscal || u.fiscal_reg);
    this.cpEmisor = texto(u.codigoPostal || u.cp || u.CP || u.Cpostal || u.cpostal || u.CodigoPostal || u.zipCode);

    this.cartaPorteForm.patchValue({
      rfcEmisor: rfc,
      nombreEmisor: nombre,
      regimenFiscal: /^\d{3}$/.test(regimen) ? regimen : ''
    }, { emitEvent: false });

    if (!this.cartaPorteForm.get('lugarExpedicion')?.value && /^\d{5}$/.test(this.cpEmisor)) {
      this.cartaPorteForm.patchValue({ lugarExpedicion: this.cpEmisor });
    }

    this.emisorEditable = !rfc || !nombre || !/^\d{3}$/.test(regimen);
    this.emisorCargado = true;
    this.sincronizarReceptorTraslado();
    if (this.emisorEditable || !this.cpEmisor) {
      console.warn('Carta Porte: perfil fiscal incompleto (RFC, nombre, régimen o CP); campos del usuario:', Object.keys(u || {}));
    }
  }

  // --- Clientes (receptor del Ingreso) ---
  private cargarClientes(): void {
    this.apibizService.getClients()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (clientes: any) => this.clientes = Array.isArray(clientes) ? clientes : [],
        error: (err: any) => console.error('Carta Porte: error cargando clientes', err)
      });
  }

  onClienteSeleccionado(clienteId: any): void {
    const c = this.clientes.find(x => x.ID === clienteId);
    if (!c) return;

    let regimen = (c.RegFiscal ?? '').toString().trim();
    if (regimen && !/^\d{3}$/.test(regimen)) {
      const r = this.regimenesFiscales.find(x => x.descripcion.toLowerCase().includes(regimen.toLowerCase()));
      regimen = r ? r.clave : '';
    }
    const rfc = (c.Rfc ?? '').toString().trim().toUpperCase();
    if (RFC_GENERICOS.includes(rfc)) regimen = '616';

    this.cartaPorteForm.patchValue({
      rfcReceptor: rfc,
      nombreReceptor: (c.nombre ?? '').toString().trim(),
      regimenFiscalReceptor: regimen,
      domicilioFiscalReceptor: (c.Cpostal ?? '').toString().trim(),
      // Retencion de IVA 4%: aplica cuando el receptor es persona moral (RFC de 12)
      aplicaRetencionIVA: rfc.length === 12 && !RFC_GENERICOS.includes(rfc)
    });
    this.ajustarUsoCfdi();
  }

  // --- Sucursales (lugar de expedicion) ---
  private cargarSucursales(): void {
    this.sucursalesService.getSucursales()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (sucursales: any) => {
          this.sucursales = Array.isArray(sucursales) ? sucursales : [];
          if (this.sucursales.length === 1) this.onSucursalSeleccionada(this.sucursales[0].id);
        },
        error: (err: any) => console.error('Carta Porte: error cargando sucursales', err)
      });
  }

  onSucursalSeleccionada(id: any): void {
    const s = this.sucursales.find(x => x.id === id);
    if (!s) return;
    this.cartaPorteForm.patchValue({ sucursalId: s.id });
    if (s.codigoPostal) this.cartaPorteForm.patchValue({ lugarExpedicion: String(s.codigoPostal).trim() });
  }

  getSucursalNombre(s: any): string {
    return s?.nombre || s?.name || s?.alias || `Sucursal ${s?.id ?? ''}`;
  }

  /** Subtotal, IVA 16%, retencion IVA 4% y total del flete (solo Ingreso) */
  get totalesFlete(): { subtotal: number; iva: number; retencion: number; total: number } {
    const f = this.cartaPorteForm;
    const subtotal = redondear2(Number(f.get('valorFlete')?.value) || 0);
    const iva = redondear2(subtotal * INGRESO_TRANSPORTISTA_DEFAULTS.TasaIVA);
    const retencion = f.get('aplicaRetencionIVA')?.value
      ? redondear2(subtotal * INGRESO_TRANSPORTISTA_DEFAULTS.TasaRetencionIVA)
      : 0;
    return { subtotal, iva, retencion, total: redondear2(subtotal + iva - retencion) };
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

  // ===== MERCANCÍAS (Carta Porte 3.1) =====
  getMercancias(): FormArray {
    return this.cartaPorteForm.get('mercancias') as FormArray;
  }

  createMercancia(): FormGroup {
    const g = this.fb.group({
      productoId: [null],
      bienesTransp: ['', [Validators.required, Validators.pattern(/^\d{8}$/)]],   // c_ClaveProdServCP
      descripcion: ['', Validators.required],
      cantidad: [1, [Validators.required, Validators.min(0.000001)]],
      claveUnidad: ['H87', [Validators.required, Validators.pattern(/^[A-Za-z0-9]{1,3}$/)]],
      unidad: ['Pieza'],
      pesoEnKg: [null as number | null, [Validators.required, Validators.min(0.001)]],
      // '' = la clave no es material peligroso; 'No' / 'Sí' cuando el catalogo lo pide
      materialPeligroso: [''],
      cveMaterialPeligroso: [''],
      embalaje: [''],
      descripEmbalaje: [''],
      valorMercancia: [null as number | null, Validators.min(0)],
      moneda: ['MXN'],
      cantidadTransporta: this.fb.array([])
    });

    g.get('materialPeligroso')?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe(valor => this.aplicarValidadoresPeligroso(g, valor));

    return g;
  }

  /** CveMaterialPeligroso y Embalaje son obligatorios solo si MaterialPeligroso = 'Sí' */
  private aplicarValidadoresPeligroso(g: FormGroup, valor: string | null): void {
    ['cveMaterialPeligroso', 'embalaje'].forEach(campo => {
      const c = g.get(campo);
      if (valor === 'Sí') {
        c?.setValidators(Validators.required);
      } else {
        c?.clearValidators();
        c?.setValue('', { emitEvent: false });
      }
      c?.updateValueAndValidity({ emitEvent: false });
    });
    if (valor !== 'Sí') g.get('descripEmbalaje')?.setValue('', { emitEvent: false });
  }

  esPeligroso(index: number): boolean {
    return this.getMercancias().at(index)?.get('materialPeligroso')?.value === 'Sí';
  }

  addMercancia(): void {
    this.getMercancias().push(this.createMercancia());
  }

  removeMercancia(index: number): void {
    if (this.getMercancias().length > 1) {
      this.getMercancias().removeAt(index);
    }
  }

  /** PesoBrutoTotal = suma de PesoEnKg; NumTotalMercancias = numero de nodos Mercancia */
  recalcularMercancias(): void {
    const lista = this.buildMercanciaList(this.getMercancias().getRawValue());
    this.cartaPorteForm.patchValue({
      pesoBrutoTotal: calcularPesoBrutoTotal(lista),
      numTotalMercancias: lista.length
    }, { emitEvent: false });

    // Con material peligroso el seguro de medio ambiente es obligatorio
    const peligroso = lista.some(m => m.MaterialPeligroso === 'Sí');
    if (peligroso !== this.hayMaterialPeligroso) {
      this.hayMaterialPeligroso = peligroso;
      ['aseguraMedAmbiente', 'polizaMedAmbiente'].forEach(campo => {
        const c = this.cartaPorteForm.get('autotransporte.seguros.' + campo);
        if (peligroso) c?.setValidators(Validators.required); else c?.clearValidators();
        c?.updateValueAndValidity({ emitEvent: false });
      });
      this.cartaPorteForm.updateValueAndValidity({ emitEvent: false });
    }
  }

  // Compatibilidad con llamadas anteriores
  updateNumTotalMercancias(): void {
    this.recalcularMercancias();
  }

  // --- Productos de inventario ---
  private cargarProductos(): void {
    this.productService.getProducts()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (productos: any) => this.productos = Array.isArray(productos) ? productos : [],
        error: (err: any) => console.error('Carta Porte: error cargando productos', err)
      });
  }

  getProductoNombre(p: any): string {
    return (p?.description || p?.nombre || p?.name || `Producto ${p?.id ?? ''}`).toString();
  }

  /** Llena descripcion, clave SAT y unidad desde el producto; el peso se toma si el producto lo tiene */
  onProductoSeleccionado(index: number, productoId: any): void {
    const p = this.productos.find(x => x.id === productoId);
    const g = this.getMercancias().at(index);
    if (!p || !g) return;

    const texto = (v: any) => (v ?? '').toString().trim();
    const sat = texto(p.satkey ?? p.sat_key ?? p.satKey);
    const unidad = texto(p.unit_key ?? p.unitKey ?? p.unitid ?? p.unitId).toUpperCase();
    const pesoUnitario = Number(p.peso ?? p.weight ?? p.pesoKg ?? p.peso_kg ?? 0);

    const patch: any = { descripcion: texto(p.description ?? p.nombre ?? p.name) };
    if (/^\d{8}$/.test(sat)) patch.bienesTransp = sat;
    if (unidad) {
      patch.claveUnidad = unidad;
      patch.unidad = UNIDADES_MERCANCIA.find(u => u.clave === unidad)?.nombre || '';
    }
    if (pesoUnitario > 0) {
      const cantidad = Number(g.get('cantidad')?.value) || 1;
      patch.pesoEnKg = Math.round(pesoUnitario * cantidad * 1000) / 1000;
    } else {
      console.info('Carta Porte: el producto no trae peso; campos disponibles:', Object.keys(p));
    }
    g.patchValue(patch);
  }

  onClaveUnidadChange(index: number): void {
    const g = this.getMercancias().at(index);
    const clave = (g?.get('claveUnidad')?.value || '').toString().trim().toUpperCase();
    const conocida = UNIDADES_MERCANCIA.find(u => u.clave === clave);
    g?.patchValue({ claveUnidad: clave, ...(conocida ? { unidad: conocida.nombre } : {}) }, { emitEvent: false });
  }

  // ===== CANTIDAD TRANSPORTA (opcional) =====
  getCantidadTransporta(mercanciaIndex: number): FormArray {
    return this.getMercancias().at(mercanciaIndex).get('cantidadTransporta') as FormArray;
  }

  createCantidadTransporta(): FormGroup {
    return this.fb.group({
      cantidad: [1, [Validators.required, Validators.min(0.000001)]],
      idOrigen: [this.getIdsUbicacion('Origen')[0] || '', Validators.required],
      idDestino: ['', Validators.required]
    });
  }

  addCantidadTransporta(mercanciaIndex: number): void {
    this.getCantidadTransporta(mercanciaIndex).push(this.createCantidadTransporta());
  }

  removeCantidadTransporta(mercanciaIndex: number, ctIndex: number): void {
    this.getCantidadTransporta(mercanciaIndex).removeAt(ctIndex);
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
    this.getRemolques().clear();
    (this.cartaPorteForm.get('transporteFerroviario.carros') as FormArray).clear();
  }

  initAutotransporte(): void {
    // Los remolques dependen de la configuracion vehicular (ajustarRemolques)
    this.ajustarRemolques(this.cartaPorteForm.get('autotransporte.identificacionVehicular.configVehicular')?.value);
  }

  initTransporteFerroviario(): void {
    this.addCarro();
  }

  // ===== REMOLQUES (Autotransporte 3.1) =====
  getRemolques(): FormArray {
    return this.cartaPorteForm.get('autotransporte.remolques') as FormArray;
  }

  createRemolque(): FormGroup {
    return this.fb.group({
      subTipoRem: ['', Validators.required],
      placa: ['', [Validators.required, Validators.pattern(/^[A-Za-z0-9]{5,7}$/)]]
    });
  }

  get requiereRemolque(): boolean {
    return requiereRemolque(this.cartaPorteForm.get('autotransporte.identificacionVehicular.configVehicular')?.value);
  }

  /** Con R/S en la configuracion se necesita al menos un remolque; sin ellas no lleva */
  ajustarRemolques(config: string): void {
    const remolques = this.getRemolques();
    if (requiereRemolque(config)) {
      if (remolques.length === 0) remolques.push(this.createRemolque());
    } else {
      remolques.clear();
    }
  }

  addRemolque(): void {
    if (this.getRemolques().length < MAX_REMOLQUES) {
      this.getRemolques().push(this.createRemolque());
    }
  }

  removeRemolque(index: number): void {
    if (this.getRemolques().length > 1) {
      this.getRemolques().removeAt(index);
    }
  }

  // ===== FIGURA TRANSPORTE 3.1 =====
  getFiguras(): FormArray {
    return this.cartaPorteForm.get('figuras') as FormArray;
  }

  createFigura(tipo: string = '01'): FormGroup {
    const g = this.fb.group({
      tipoFigura: [tipo, Validators.required],
      rfcFigura: ['', [Validators.required, Validators.pattern(RFC_INPUT)]],
      nombreFigura: ['', Validators.required],
      numLicencia: [''],
      parteTransporte: ['']
    });
    const aplicar = (t: string) => {
      const lic = g.get('numLicencia');
      const parte = g.get('parteTransporte');
      if (t === '01') lic?.setValidators(Validators.required); else { lic?.clearValidators(); lic?.setValue('', { emitEvent: false }); }
      if (t === '02' || t === '03') parte?.setValidators(Validators.required); else { parte?.clearValidators(); parte?.setValue('', { emitEvent: false }); }
      lic?.updateValueAndValidity({ emitEvent: false });
      parte?.updateValueAndValidity({ emitEvent: false });
    };
    aplicar(tipo);
    g.get('tipoFigura')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(t => aplicar(t || ''));
    return g;
  }

  addFigura(tipo: string = '04'): void {
    this.getFiguras().push(this.createFigura(tipo));
  }

  /** Siempre debe quedar al menos un Operador */
  puedeEliminarFigura(index: number): boolean {
    const figuras = this.getFiguras().controls;
    const esOperador = figuras[index]?.get('tipoFigura')?.value === '01';
    const operadores = figuras.filter(f => f.get('tipoFigura')?.value === '01').length;
    return figuras.length > 1 && (!esOperador || operadores > 1);
  }

  removeFigura(index: number): void {
    if (this.puedeEliminarFigura(index)) this.getFiguras().removeAt(index);
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
  /**
   * CFDI 4.0 + Complemento Carta Porte 3.1.
   * Nivel CFDI, Ubicaciones y encabezado del complemento ya usan los nombres del XSD.
   * Todos los nodos usan los nombres del XSD (fase 1: solo autotransporte).
   */
  generateJSON(): any {
    const fv = this.cartaPorteForm.getRawValue();
    const esIngreso = fv.tipoDeComprobante === 'I';
    const totales = this.totalesFlete;

    const cfdi: any = {
      Version: '4.0',
      TipoDeComprobante: fv.tipoDeComprobante,
      LugarExpedicion: fv.lugarExpedicion,
      Exportacion: TRASLADO_DEFAULTS.Exportacion,
      Moneda: esIngreso ? 'MXN' : TRASLADO_DEFAULTS.Moneda,
      SubTotal: esIngreso ? totales.subtotal : 0,
      Total: esIngreso ? totales.total : 0
    };
    const serie = (fv.serie || '').toString().trim();
    const folio = (fv.folio || '').toString().trim();
    if (serie) cfdi.Serie = serie;
    if (folio) cfdi.Folio = folio;
    if (esIngreso) {
      cfdi.FormaPago = fv.formaPago;
      cfdi.MetodoPago = fv.metodoPago;
    }

    cfdi.Emisor = {
      Rfc: (fv.rfcEmisor || '').trim().toUpperCase(),
      Nombre: (fv.nombreEmisor || '').trim(),
      RegimenFiscal: fv.regimenFiscal
    };
    cfdi.Receptor = {
      Rfc: (fv.rfcReceptor || '').trim().toUpperCase(),
      Nombre: (fv.nombreReceptor || '').trim(),
      DomicilioFiscalReceptor: fv.domicilioFiscalReceptor,
      RegimenFiscalReceptor: fv.regimenFiscalReceptor,
      UsoCFDI: fv.usoCFDI
    };
    cfdi.Conceptos = this.buildConceptos(fv);
    cfdi.Complemento = { CartaPorte: this.buildCartaPorte(fv) };

    return cfdi;
  }

  buildConceptos(fv: any): ConceptoCP[] {
    if (fv.tipoDeComprobante === 'I') {
      const t = this.totalesFlete;
      const concepto: ConceptoCP = {
        ClaveProdServ: INGRESO_TRANSPORTISTA_DEFAULTS.ClaveProdServ,
        Cantidad: 1,
        ClaveUnidad: INGRESO_TRANSPORTISTA_DEFAULTS.ClaveUnidad,
        Unidad: 'Unidad de servicio',
        Descripcion: (fv.descripcionServicio || 'Servicio de transporte de carga').trim(),
        ValorUnitario: t.subtotal,
        Importe: t.subtotal,
        ObjetoImp: INGRESO_TRANSPORTISTA_DEFAULTS.ObjetoImp,
        Impuestos: {
          Traslados: [{
            Base: t.subtotal, Impuesto: '002', TipoFactor: 'Tasa',
            TasaOCuota: INGRESO_TRANSPORTISTA_DEFAULTS.TasaIVA, Importe: t.iva
          }]
        }
      };
      if (t.retencion > 0) {
        concepto.Impuestos!.Retenciones = [{
          Base: t.subtotal, Impuesto: '002', TipoFactor: 'Tasa',
          TasaOCuota: INGRESO_TRANSPORTISTA_DEFAULTS.TasaRetencionIVA, Importe: t.retencion
        }];
      }
      return [concepto];
    }

    // Traslado: un concepto por mercancia, valor 0 y no objeto de impuesto.
    // BienesTransp, Cantidad y ClaveUnidad se capturan en el paso 4 (Mercancias).
    return (fv.mercancias || []).map((m: any) => ({
      ClaveProdServ: m.bienesTransp || '01010101',
      Cantidad: Number(m.cantidad) || 1,
      ClaveUnidad: (m.claveUnidad || 'H87').toString().trim().toUpperCase(),
      Descripcion: (m.descripcion || '').trim() || 'Mercancía',
      ValorUnitario: 0,
      Importe: 0,
      ObjetoImp: TRASLADO_DEFAULTS.ObjetoImp
    }));
  }

  buildCartaPorte(formValue: any): any {
    const cartaPorte: any = {
      Version: '3.1',
      IdCCP: this.idCCP,
      TranspInternac: formValue.transpInternac,
      TotalDistRec: formValue.totalDistRec
    };

    if (formValue.transpInternac === 'Sí' && formValue.entradaSalidaMerc) {
      cartaPorte.EntradaSalidaMerc = formValue.entradaSalidaMerc;
    }

    cartaPorte.Ubicaciones = this.buildUbicaciones(formValue.ubicaciones);

    // Mercancias 3.1 con su nodo Autotransporte
    cartaPorte.Mercancias = this.buildMercancias(formValue);

    cartaPorte.FiguraTransporte = this.buildFiguras(formValue.figuras);

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

  /** Convierte el FormArray de mercancias al nodo Mercancia de Carta Porte 3.1 */
  buildMercanciaList(mercancias: any[]): MercanciaCP[] {
    const texto = (v: any) => (v ?? '').toString().trim();
    return (mercancias || []).map(m => {
      const mercancia: MercanciaCP = {
        BienesTransp: texto(m.bienesTransp),
        Descripcion: texto(m.descripcion),
        Cantidad: Number(m.cantidad) || 0,
        ClaveUnidad: texto(m.claveUnidad).toUpperCase(),
        PesoEnKg: Number(m.pesoEnKg) || 0
      };
      if (texto(m.unidad)) mercancia.Unidad = texto(m.unidad);

      if (m.materialPeligroso === 'Sí' || m.materialPeligroso === 'No') {
        mercancia.MaterialPeligroso = m.materialPeligroso;
      }
      if (m.materialPeligroso === 'Sí') {
        mercancia.CveMaterialPeligroso = texto(m.cveMaterialPeligroso);
        mercancia.Embalaje = texto(m.embalaje).toUpperCase();
        if (texto(m.descripEmbalaje)) mercancia.DescripEmbalaje = texto(m.descripEmbalaje);
      }

      const valor = Number(m.valorMercancia);
      if (valor > 0) {
        mercancia.ValorMercancia = redondear2(valor);
        mercancia.Moneda = texto(m.moneda) || 'MXN';
      }

      const distribucion = (m.cantidadTransporta || []).filter((ct: any) => ct.idOrigen && ct.idDestino);
      if (distribucion.length > 0) {
        mercancia.CantidadTransporta = distribucion.map((ct: any) => ({
          Cantidad: Number(ct.cantidad) || 0,
          IDOrigen: ct.idOrigen,
          IDDestino: ct.idDestino
        }));
      }
      return mercancia;
    });
  }

  buildMercancias(formValue: any): any {
    const lista = this.buildMercanciaList(formValue.mercancias);
    const mercancias: any = {
      PesoBrutoTotal: calcularPesoBrutoTotal(lista),
      UnidadPeso: 'KGM',
      NumTotalMercancias: lista.length,
      Mercancia: lista
    };
    const pesoNeto = Number(formValue.pesoNetoTotal);
    if (pesoNeto > 0) mercancias.PesoNetoTotal = Math.round(pesoNeto * 1000) / 1000;

    // Fase 1: solo autotransporte
    if (formValue.tipoTransporte === '01') {
      mercancias.Autotransporte = this.buildAutotransporte(formValue.autotransporte);
    }

    return mercancias;
  }

  buildAutotransporte(at: any): AutotransporteCP {
    const texto = (v: any) => (v ?? '').toString().trim();
    const iv = at?.identificacionVehicular || {};
    const sg = at?.seguros || {};

    const autotransporte: AutotransporteCP = {
      PermSCT: texto(at?.permSCT),
      NumPermisoSCT: texto(at?.numPermisoSCT),
      IdentificacionVehicular: {
        ConfigVehicular: texto(iv.configVehicular),
        PesoBrutoVehicular: Math.round((Number(iv.pesoBrutoVehicular) || 0) * 100) / 100,
        PlacaVM: texto(iv.placaVM).toUpperCase(),
        AnioModeloVM: Number(iv.anioModeloVM) || 0
      },
      Seguros: {
        AseguraRespCivil: texto(sg.aseguraRespCivil),
        PolizaRespCivil: texto(sg.polizaRespCivil)
      }
    };
    if (texto(sg.aseguraMedAmbiente)) autotransporte.Seguros.AseguraMedAmbiente = texto(sg.aseguraMedAmbiente);
    if (texto(sg.polizaMedAmbiente)) autotransporte.Seguros.PolizaMedAmbiente = texto(sg.polizaMedAmbiente);
    if (texto(sg.aseguraCarga)) autotransporte.Seguros.AseguraCarga = texto(sg.aseguraCarga);
    if (texto(sg.polizaCarga)) autotransporte.Seguros.PolizaCarga = texto(sg.polizaCarga);
    if (Number(sg.primaSeguro) > 0) autotransporte.Seguros.PrimaSeguro = redondear2(Number(sg.primaSeguro));

    const remolques = (at?.remolques || []).filter((r: any) => texto(r.subTipoRem) && texto(r.placa));
    if (remolques.length > 0) {
      autotransporte.Remolques = remolques.map((r: any) => ({
        SubTipoRem: texto(r.subTipoRem),
        Placa: texto(r.placa).toUpperCase()
      }));
    }
    return autotransporte;
  }

  buildFiguras(figuras: any[]): TipoFiguraCP[] {
    const texto = (v: any) => (v ?? '').toString().trim();
    return (figuras || []).map(f => {
      const figura: TipoFiguraCP = {
        TipoFigura: f.tipoFigura,
        RFCFigura: texto(f.rfcFigura).toUpperCase(),
        NombreFigura: texto(f.nombreFigura)
      };
      if (f.tipoFigura === '01') figura.NumLicencia = texto(f.numLicencia);
      if ((f.tipoFigura === '02' || f.tipoFigura === '03') && texto(f.parteTransporte)) {
        figura.PartesTransporte = [{ ParteTransporte: texto(f.parteTransporte) }];
      }
      return figura;
    });
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
  /** Reglas de negocio de Carta Porte 3.1 sobre el JSON generado (no sustituye al XSD ni al PAC) */
  validarJSON(json: any): string[] {
    this.erroresValidacion = validarCartaPorte(json as CfdiCartaPorte);
    return this.erroresValidacion;
  }

  onPreview(): void {
    const json = this.generateJSON();
    const errores = this.validarJSON(json);

    console.log('JSON Generado:', JSON.stringify(json, null, 2));
    if (errores.length > 0) {
      console.warn('Carta Porte: validaciones pendientes', errores);
    }

    this.snackBar.open(
      errores.length > 0
        ? `JSON generado con ${errores.length} validación(es) pendiente(s). Revisa la lista al final del formulario.`
        : 'JSON generado sin errores de validación.',
      'OK',
      { duration: 5000 }
    );

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
      const json = this.generateJSON();
      const errores = this.validarJSON(json);
      if (errores.length > 0) {
        this.snackBar.open(`Hay ${errores.length} validación(es) pendiente(s). Revisa la lista al final del formulario.`, 'OK', { duration: 5000 });
        return;
      }

      this.loading = true;

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