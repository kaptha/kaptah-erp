import { Component, Inject, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, FormControl, Validators, AbstractControl } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { CFDIService } from '../../../services/cfdi.service';
import { ApibizService } from '../../../services/apibiz.service';
import { ImpuestosService } from '../../../services/impuestos.service';
import { ProductService } from '../../../services/inventory/product.service';
import { ServiceService } from '../../../services/inventory/service.service';
import { SucursalesService } from '../../../services/sucursales.service';
import { UsersService } from '../../../services/users.service';
import { Observable, of, Subject } from 'rxjs';
import { map, startWith, takeUntil, switchMap } from 'rxjs/operators';
import { CFDI } from '../../../models/cfdi.model';
import { Cliente } from '../../../models/cliente.model';
import { Product } from '../../../models/product.model';
import { Service } from '../../../models/service.model';
import { Sucursal } from '../../../models/sucursal.model';
import { Sweetalert } from '../../../functions';
import Swal from 'sweetalert2';
interface ClienteExtendido extends Cliente {
  Cpostal: string;
  Colonia: string;
}

interface Impuesto {
  id?: number;
  alias: string;
  uso: string;
  tipo_impuesto: string;
  impuesto: string;
  tasa: number;
  valor_cuota: string;  
  userId: number;
  selected?: boolean;  // Para el checkbox
  importe?: number;     // Para calcular el monto
}

interface CatalogoSAT {
  clave: string;
  descripcion: string;
}

@Component({
    selector: 'app-add-cfdi-modal',
    templateUrl: './add-cfdi-modal.component.html',
    styleUrls: ['./add-cfdi-modal.component.css'],
    standalone: false
})
export class AddCfdiModalComponent implements OnInit, OnDestroy {
  cfdiForm!: FormGroup;
  private destroy$ = new Subject<void>();
  
  productos: Product[] = [];
  servicios: Service[] = [];
  clientes: Cliente[] = [];
  sucursales: Sucursal[] = [];
  impuestosUsuario: Impuesto[] = [];  // ✅ Array de impuestos del usuario
  datosEmisor: any = null;  // ✅ Datos del emisor cargados desde la BD
  
  loading = false;
  loadingSucursales = false;
  isEditing = false;
  activeTab = 'General';
  
  selectedSucursal: Sucursal | null = null;
  selectedCliente: Cliente | null = null;
  
  clienteFilterCtrl = new FormControl('');
  conceptoFilterCtrl = new FormControl('');
  
  filteredClientes!: Observable<Cliente[]>;
  filteredConceptos: Observable<any[]>[] = [];

  regimenesFiscales = [
    { clave: '601', descripcion: ' - General de Ley Personas Morales' },
    { clave: '603', descripcion: ' - Personas Morales con Fines no Lucrativos' },
    { clave: '605', descripcion: ' - Sueldos y Salarios e Ingresos Asimilados a Salarios' },
    { clave: '606', descripcion: ' - Arrendamiento' },
    { clave: '607', descripcion: ' - Régimen de Enajenación o Adquisición de Bienes' },
    { clave: '608', descripcion: ' - Demás ingresos' },
    { clave: '610', descripcion: ' - Residentes en el Extranjero sin Establecimiento Permanente en México' },
    { clave: '611', descripcion: ' - Ingresos por Dividendos (socios y accionistas)' },
    { clave: '612', descripcion: ' - Personas Físicas con Actividades Empresariales y Profesionales' },
    { clave: '614', descripcion: ' - Ingresos por intereses' },
    { clave: '615', descripcion: ' - Régimen de los ingresos por obtención de premios' },
    { clave: '616', descripcion: ' - Sin obligaciones fiscales' },
    { clave: '620', descripcion: ' - Sociedades Cooperativas de Producción que optan por diferir sus ingresos' },
    { clave: '621', descripcion: ' - Incorporación Fiscal' },
    { clave: '622', descripcion: ' - Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras' },
    { clave: '623', descripcion: ' - Opcional para Grupos de Sociedades' },
    { clave: '624', descripcion: ' - Coordinados' },
    { clave: '625', descripcion: ' - Régimen de las Actividades Empresariales con ingresos a través de Plataformas Tecnológicas' },
    { clave: '626', descripcion: ' - Régimen Simplificado de Confianza' }
  ];

  unidadesSAT = [
    { clave: 'H87', descripcion: ' - Pieza' },
    { clave: 'E48', descripcion: ' - Unidad de servicio' },
    { clave: 'ACT', descripcion: ' - Actividad' },
    { clave: 'KGM', descripcion: ' - Kilogramo' },
    { clave: 'LTR', descripcion: ' - Litro' },
    { clave: 'MTR', descripcion: ' - Metro' },
    { clave: 'MTK', descripcion: ' - Metro cuadrado' },
    { clave: 'HUR', descripcion: ' - Hora' },
    { clave: 'DAY', descripcion: ' - Día' }
  ];

  objetosImpuesto = [
    { clave: '01', descripcion: ' - No objeto de impuesto' },
    { clave: '02', descripcion: ' - Sí objeto de impuesto' },
    { clave: '03', descripcion: ' - Sí objeto del impuesto y no obligado al desglose' },
    { clave: '04', descripcion: ' - Sí objeto del impuesto y no causa impuesto' }
  ];

  formasPago = [
    { codigo: '01', nombre: ' - Efectivo' },
    { codigo: '02', nombre: ' - Cheque nominativo' },
    { codigo: '03', nombre: ' - Transferencia electrónica de fondos' },
    { codigo: '04', nombre: ' - Tarjeta de crédito' },
    { codigo: '28', nombre: ' - Tarjeta de débito' },
    { codigo: '99', nombre: ' - Por definir' }
  ];

  metodosPago = [
    { codigo: 'PUE', nombre: ' - Pago en una sola exhibición' },
    { codigo: 'PPD', nombre: ' - Pago en parcialidades o diferido' }
  ];

  usosCfdi = [
    { codigo: 'G01', nombre: ' - Adquisición de mercancías', tipo: 'ambos' },
    { codigo: 'G02', nombre: ' - Devoluciones, descuentos o bonificaciones', tipo: 'ambos' },
    { codigo: 'G03', nombre: ' - Gastos en general', tipo: 'fisica' },
    { codigo: 'I01', nombre: ' - Construcciones', tipo: 'moral' },
    { codigo: 'I02', nombre: ' - Mobilario y equipo de oficina por inversiones', tipo: 'moral' },
    { codigo: 'I03', nombre: ' - Equipo de transporte', tipo: 'moral' },
    { codigo: 'I04', nombre: ' - Equipo de cómputo y accesorios', tipo: 'moral' },
    { codigo: 'I05', nombre: ' - Dados, troqueles, moldes, matrices y herramental', tipo: 'moral' },
    { codigo: 'I06', nombre: ' - Comunicaciones telefónicas', tipo: 'moral' },
    { codigo: 'I07', nombre: ' - Comunicaciones satelitales', tipo: 'moral' },
    { codigo: 'I08', nombre: ' - Otra maquinaria y equipo', tipo: 'moral' },
    { codigo: 'D01', nombre: ' - Honorarios médicos, dentales y gastos hospitalarios', tipo: 'fisica' },
    { codigo: 'D02', nombre: ' - Gastos médicos por incapacidad o discapacidad', tipo: 'fisica' },
    { codigo: 'D03', nombre: ' - Gastos funerales', tipo: 'fisica' },
    { codigo: 'D04', nombre: ' - Donativos', tipo: 'fisica' },
    { codigo: 'D05', nombre: ' - Intereses reales efectivamente pagados por créditos hipotecarios', tipo: 'fisica' },
    { codigo: 'D06', nombre: ' - Aportaciones voluntarias al SAR', tipo: 'fisica' },
    { codigo: 'D07', nombre: ' - Primas por seguros de gastos médicos', tipo: 'fisica' },
    { codigo: 'D08', nombre: ' - Gastos de transportación escolar obligatoria', tipo: 'fisica' },
    { codigo: 'D09', nombre: ' - Depósitos en cuentas para el ahorro', tipo: 'fisica' },
    { codigo: 'D10', nombre: ' - Pagos por servicios educativos (colegiaturas)', tipo: 'fisica' },
    { codigo: 'P01', nombre: ' - Por definir', tipo: 'ambos' },
    { codigo: 'CP01', nombre: ' - Pagos', tipo: 'ambos' },
    { codigo: 'CN01', nombre: ' - Nómina', tipo: 'ambos' },
    { codigo: 'S01', nombre: ' - Sin efectos fiscales', tipo: 'ambos' }
  ];

  constructor(
    private fb: FormBuilder,
    private cfdiService: CFDIService,
    private apibizService: ApibizService,
    private impuestosService: ImpuestosService,
    private productService: ProductService,
    private serviceService: ServiceService,
    private sucursalesService: SucursalesService,
    private usersService: UsersService,
    public dialogRef: MatDialogRef<AddCfdiModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadDatosUsuario();  // ✅ Cargar datos del usuario primero
    this.loadProductos();
    this.loadServicios();
    this.loadClientes();
    this.loadSucursales();
    this.loadImpuestos();  // ✅ Cargar impuestos del usuario
    this.setupFilters();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ✅ Cargar datos del usuario desde MySQL
  loadDatosUsuario(): void {
    const firebaseUid = localStorage.getItem('activeCuentaUid');
    if (!firebaseUid) {
      console.error('❌ No se encontró activeCuentaUid');
      this.datosEmisor = this.obtenerDatosUsuario();
      return;
    }
    this.usersService.getUserFromMySQL(firebaseUid)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (user: any) => {
          if (!user) {
            console.error('❌ No se encontró el usuario en MySQL');
            this.datosEmisor = this.obtenerDatosUsuario();
            return;
          }
          console.log('✅ Usuario desde MySQL:', user);
          this.datosEmisor = {
            rfc: user.rfc || '',
            nombre: user.nombre || user.nombreComercial || '',
            fiscalReg: user.fiscalReg || '612'
          };
          console.log('✅ DATOS DEL EMISOR FINALES:', this.datosEmisor);
        },
        error: (error) => {
          console.error('❌ Error cargando datos del usuario:', error);
          this.datosEmisor = this.obtenerDatosUsuario();
        }
      });
  }
  loadServicios(): void {
  this.serviceService.getServices()
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (servicios) => {
        this.servicios = servicios;
        console.log('✅ Servicios cargados:', this.servicios);
      },
      error: (error) => console.error('Error cargando servicios:', error)
    });
}

  // ✅ CORREGIDO: FormGroup con todos los campos que coinciden con el HTML
  initForm(): void {
    this.cfdiForm = this.fb.group({
      // Campos de sucursal y datos generales
      sucursal: [null],
      serie: ['A', Validators.required],
      folio: [''],  // ✅ Campo folio agregado (opcional, se genera automático si está vacío)
      fecha: [new Date().toISOString().split('T')[0], Validators.required],
      metodoPago: ['PUE', Validators.required],
      formaPago: ['01', Validators.required],
      moneda: ['MXN', Validators.required],
      tipoCambio: [1, Validators.required],
      exportacion: ['01', Validators.required],
      lugarExpedicion: ['', [Validators.required, Validators.pattern(/^\d{5}$/)]],
      
      // Campos de cliente receptor
      clienteId: ['', Validators.required],
      receptorRfc: ['', [Validators.required, Validators.pattern(/^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/)]],
      receptorNombre: ['', Validators.required],
      regimenFiscalReceptor: ['612', Validators.required],  // ✅ Nombre corregido
      receptorDomicilioFiscal: ['', [Validators.required, Validators.pattern(/^\d{5}$/)]],
      usoCfdi: ['G01', Validators.required],  // ✅ Campo de Uso CFDI agregado
      
      // Conceptos
      conceptos: this.fb.array([this.createConcepto()], Validators.required),
      
      // Certificado
      csdPassword: ['', Validators.required],
      
      // Totales (calculados)
      subtotal: [0],
      descuento: [0],
      impuestos: [0],
      total: [0]
    });
  }

  createConcepto(): FormGroup {
    return this.fb.group({
      tipoConcepto: ['producto', Validators.required],
      productoId: ['', Validators.required],
      claveProdServ: ['01010101', Validators.required],
      cantidad: [1, [Validators.required, Validators.min(0.01)]],
      claveUnidad: ['H87', Validators.required],
      unidad: ['Pieza', Validators.required],
      descripcion: ['', Validators.required],
      valorUnitario: [0, [Validators.required, Validators.min(0)]],
      importe: [{ value: 0, disabled: true }],
      descuento: [0, [Validators.min(0)]],
      objetoImp: ['02', Validators.required],
      impuestos: this.fb.group({
        traslados: this.fb.array([]),
        retenciones: this.fb.array([])
      }),
      impuestosTotal: [0],
      total: [0]
    });
  }
  // ✅ NUEVO: Obtener productos o servicios según la selección
getConceptoItems(index: number): any[] {
  const concepto = this.conceptos.at(index);
  const tipoConcepto = concepto.get('tipoConcepto')?.value;
  
  return tipoConcepto === 'servicio' ? this.servicios : this.productos;
}

// ✅ NUEVO: Método cuando cambia el tipo de concepto
onTipoConceptoChange(index: number): void {
  const concepto = this.conceptos.at(index);
  // Limpiar el producto/servicio seleccionado al cambiar el tipo
  concepto.patchValue({
    productoId: '',
    claveProdServ: '01010101',
    descripcion: '',
    valorUnitario: 0,
    claveUnidad: 'H87',
    unidad: 'Pieza'
  });
  this.calcularImporteConcepto(index);
}
  get conceptos(): FormArray {
    return this.cfdiForm.get('conceptos') as FormArray;
  }

  // ✅ Getter para filtrar usos de CFDI según el RFC del receptor
  get usoCfdiDisponibles() {
    const receptorRfc = this.cfdiForm.get('receptorRfc')?.value;
    if (!receptorRfc || receptorRfc.length < 12) {
      return this.usosCfdi.filter(uso => uso.tipo === 'ambos');
    }
    
    // RFC de 12 caracteres = Persona Moral, 13 = Persona Física
    const esPersonaMoral = receptorRfc.length === 12;
    
    if (esPersonaMoral) {
      return this.usosCfdi.filter(uso => uso.tipo === 'ambos' || uso.tipo === 'moral');
    } else {
      return this.usosCfdi.filter(uso => uso.tipo === 'ambos' || uso.tipo === 'fisica');
    }
  }

  changeTab(tab: string): void {
    this.activeTab = tab;
  }

  isInvalid(field: string): boolean {
    const control = this.cfdiForm.get(field);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  isConceptoInvalid(index: number, field: string): boolean {
    const control = this.conceptos.at(index).get(field);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  loadProductos(): void {
    this.productService.getProducts()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (productos) => {
          this.productos = productos;
        },
        error: (error) => console.error('Error cargando productos:', error)
      });
  }

  loadClientes(): void {
    this.apibizService.getClients()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (clientes) => {
          this.clientes = clientes;
        },
        error: (error) => console.error('Error cargando clientes:', error)
      });
  }

  loadSucursales(): void {
    this.loadingSucursales = true;
    this.sucursalesService.getSucursales()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (sucursales) => {
          this.sucursales = sucursales;
          this.loadingSucursales = false;
        },
        error: (error) => {
          console.error('Error cargando sucursales:', error);
          this.loadingSucursales = false;
        }
      });
  }

  // ✅ NUEVO: Cargar impuestos del usuario
  loadImpuestos(): void {
    this.impuestosService.getImpuestos()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (impuestos) => {
          this.impuestosUsuario = impuestos;
          console.log('Impuestos cargados:', this.impuestosUsuario);
          
          // Si ya hay conceptos creados, agregarles los impuestos
          if (this.conceptos && this.conceptos.length > 0) {
            this.conceptos.controls.forEach((concepto, index) => {
              this.agregarImpuestosAConcepto(index);
            });
          }
        },
        error: (error) => {
          console.error('Error cargando impuestos:', error);
        }
      });
  }

  setupFilters(): void {
    this.filteredClientes = this.clienteFilterCtrl.valueChanges.pipe(
      startWith(''),
      map(value => this._filterClientes(value || ''))
    );
  }

  private _filterClientes(value: string): Cliente[] {
    const filterValue = value.toLowerCase();
    return this.clientes.filter(cliente => 
      (cliente.nombre || '').toLowerCase().includes(filterValue) ||
      (cliente.Rfc || '').toLowerCase().includes(filterValue)
    );
  }

  onSucursalSelect(event: any): void {
    const sucursalId = event.value;
    this.selectedSucursal = this.sucursales.find(s => s.id === sucursalId) || null;
    if (this.selectedSucursal) {
      this.cfdiForm.patchValue({
        lugarExpedicion: this.selectedSucursal.codigoPostal || ''
      });
    }
  }

  onClienteSelect(event: any): void {
    this.onClienteSelected(event.value);
  }

  onClienteSelected(clienteId: number): void {
    const cliente = this.clientes.find(c => c.ID === clienteId);
    if (cliente) {
      this.selectedCliente = cliente;
      
      let regimenFiscal = cliente.RegFiscal || '612';
      if (regimenFiscal && !/^\d{3}$/.test(regimenFiscal)) {
        const found = this.regimenesFiscales.find(r => 
          r.descripcion.toLowerCase().includes(regimenFiscal.toLowerCase())
        );
        regimenFiscal = found ? found.clave : '612';
        console.warn('⚠️ RegFiscal del cliente era texto, convertido a código:', regimenFiscal);
      }
      
      console.log('✅ Cliente seleccionado:', {
        nombre: cliente.nombre,
        rfc: cliente.Rfc,
        regimenFiscal: regimenFiscal
      });
      
      // ✅ Determinar uso CFDI por defecto según el régimen
      let usoCfdiDefault = 'G01'; // Por defecto: Adquisición de mercancías
      
      // Si es persona física (regímenes 605, 606, 612, 621, etc.)
      if (['605', '606', '612', '621', '626'].includes(regimenFiscal)) {
        usoCfdiDefault = 'G03'; // Gastos en general (persona física)
      }
      
      console.log('✅ Uso CFDI sugerido:', usoCfdiDefault);
      
      this.cfdiForm.patchValue({
        receptorRfc: cliente.Rfc,
        receptorNombre: cliente.nombre,
        regimenFiscalReceptor: regimenFiscal,
        receptorDomicilioFiscal: cliente.Cpostal || '',
        usoCfdi: usoCfdiDefault  // ✅ Establecer uso CFDI por defecto
      });
      
      console.log('📋 Formulario actualizado:', {
        regimenFiscalReceptor: this.cfdiForm.get('regimenFiscalReceptor')?.value,
        usoCfdi: this.cfdiForm.get('usoCfdi')?.value
      });
    }
  }

  onConceptoSelect(event: any, index: number): void {
    this.onProductoSelected(index, event.value);
  }

  onProductoSelected(index: number, itemId: number): void {
  const concepto = this.conceptos.at(index);
  const tipoConcepto = concepto.get('tipoConcepto')?.value;
  
  if (tipoConcepto === 'servicio') {
  const servicio: any = this.servicios.find(s => s.id === itemId);
  if (servicio) {
    console.log('🔍 Servicio seleccionado:', servicio);
    
    // ✅ Buscar de todas las formas posibles
    let satKey = servicio.satkey || servicio['satkey'] || servicio.sat_key || servicio['sat_key'];
    
    // Si aún es undefined, buscar en todas las propiedades
    if (!satKey) {
      console.log('⚠️ satkey no encontrado en servicio, buscando...');
      for (let key in servicio) {
        if (key.toLowerCase().includes('sat')) {
          console.log(`   Encontrada propiedad: ${key} = ${servicio[key]}`);
          satKey = servicio[key];
          break;
        }
      }
    }
    
    // ✅ Buscar unitId con todas las variaciones
    let unitKey = servicio.unitid || servicio['unitid'] || servicio.unitId || servicio['unitId'] || servicio.unit_id;
    
    console.log('   - satkey encontrado:', satKey, 'tipo:', typeof satKey);
    console.log('   - unitKey encontrado:', unitKey, 'tipo:', typeof unitKey);
    
    concepto.patchValue({
      claveProdServ: satKey || '01010101',
      descripcion: servicio.description || servicio['description'] || '',
      valorUnitario: servicio.price || servicio['price'] || 0,
      claveUnidad: unitKey || 'E48',
      unidad: this.obtenerNombreUnidad(unitKey)
    });
  }
} else {
    const producto: any = this.productos.find(p => p.id === itemId);
    if (producto) {
      console.log('🔍 Producto COMPLETO:', JSON.stringify(producto, null, 2));
      console.log('🔍 Probando accesos:');
      console.log('   producto.satkey:', producto.satkey);
      console.log('   producto["satkey"]:', producto["satkey"]);
      console.log('   Tipo de producto:', typeof producto);
      console.log('   Es array?', Array.isArray(producto));
      
      // ✅ Intentar de todas las formas posibles
      let satKey = producto.satkey || producto['satkey'] || producto.sat_key || producto['sat_key'];
      
      // Si aún es undefined, buscar en todas las propiedades
      if (!satKey) {
        console.log('⚠️ satkey no encontrado, buscando en propiedades...');
        for (let key in producto) {
          if (key.toLowerCase().includes('sat')) {
            console.log(`   Encontrada propiedad relacionada: ${key} = ${producto[key]}`);
            satKey = producto[key];
            break;
          }
        }
      }
      
      const unitKey = producto.unit_key || producto['unit_key'];
      
      console.log('   - satkey FINAL:', satKey, 'tipo:', typeof satKey);
      console.log('   - unit_key FINAL:', unitKey, 'tipo:', typeof unitKey);
      
      concepto.patchValue({
        claveProdServ: satKey || '01010101',
        descripcion: producto.description || producto['description'] || '',
        valorUnitario: producto.price || producto['price'] || 0,
        claveUnidad: unitKey || 'H87',
        unidad: this.obtenerNombreUnidad(unitKey)
      });
      
      console.log('✅ Concepto actualizado:', concepto.value);
    }
  }
  
  this.agregarImpuestosAConcepto(index);
  this.calcularImporteConcepto(index);
}

// ✅ Agregar este método
private obtenerNombreUnidad(claveUnidad?: string): string {
  if (!claveUnidad) return 'Pieza';
  
  const unidad = this.unidadesSAT.find(u => u.clave === claveUnidad);
  return unidad ? unidad.descripcion.replace(/^\s*-\s*/, '') : 'Pieza';
}

  // ✅ NUEVO: Método para agregar impuestos configurados a un concepto
  agregarImpuestosAConcepto(index: number): void {
    const concepto = this.conceptos.at(index);
    const trasladosArray = concepto.get('impuestos.traslados') as FormArray;
    const retencionesArray = concepto.get('impuestos.retenciones') as FormArray;
    
    // Limpiar arrays existentes
    while (trasladosArray.length > 0) {
      trasladosArray.removeAt(0);
    }
    while (retencionesArray.length > 0) {
      retencionesArray.removeAt(0);
    }
    
    // ✅ Mapeo de nombres de impuestos a códigos SAT
    const mapeoImpuestos: { [key: string]: string } = {
      'IVA': '002',
      'ISR': '001',
      'IEPS': '003',
      'Federal': '002',  // Asumir IVA si dice "Federal"
      '002': '002',
      '001': '001',
      '003': '003'
    };
    
    // Agregar impuestos del usuario
    this.impuestosUsuario.forEach(impuesto => {
      // ✅ Convertir nombre de impuesto a código SAT
      const codigoImpuesto = mapeoImpuestos[impuesto.impuesto] || '002';
      
      const impuestoControl = this.fb.group({
        id: [impuesto.id],
        alias: [impuesto.alias],
        uso: [impuesto.uso],
        tipo_impuesto: [impuesto.tipo_impuesto],
        impuesto: [codigoImpuesto],  // ✅ Usar código SAT en lugar del nombre
        impuestoOriginal: [impuesto.impuesto],  // ✅ Guardar nombre original para referencia
        tasa: [impuesto.tasa],
        valor_cuota: [impuesto.valor_cuota],
        selected: [false],  // Por defecto no seleccionado
        base: [0],
        importe: [0]
      });
      
      // Agregar a traslados o retenciones según el tipo
      if (impuesto.tipo_impuesto === 'Traslado') {
        trasladosArray.push(impuestoControl);
      } else if (impuesto.tipo_impuesto === 'Retención') {
        retencionesArray.push(impuestoControl);
      }
    });
    
    console.log(`✅ Impuestos agregados al concepto ${index}:`, {
      traslados: trasladosArray.length,
      retenciones: retencionesArray.length,
      detalleTraslados: trasladosArray.value,
      detalleRetenciones: retencionesArray.value
    });
  }

  onImpuestoSelectionChange(index: number): void {
    this.calcularImporteConcepto(index);
  }

  calcularImporteConcepto(index: number): void {
    this.onConceptoChange(index);
  }

  onConceptoChange(index: number): void {
    const concepto = this.conceptos.at(index);
    const cantidad = concepto.get('cantidad')?.value || 0;
    const valorUnitario = concepto.get('valorUnitario')?.value || 0;
    const descuento = concepto.get('descuento')?.value || 0;

    const importe = (cantidad * valorUnitario) - descuento;
    concepto.get('importe')?.setValue(importe, { emitEvent: false });

    // Calcular impuestos
    let totalImpuestos = 0;
    
    const traslados = concepto.get('impuestos.traslados') as FormArray;
    if (traslados && traslados.length > 0) {
      traslados.controls.forEach(traslado => {
        if (traslado.get('selected')?.value) {
          const tasa = traslado.get('tasa')?.value || 0;
          const importeImpuesto = importe * tasa;
          traslado.get('importe')?.setValue(importeImpuesto, { emitEvent: false });
          totalImpuestos += importeImpuesto;
        }
      });
    }

    const retenciones = concepto.get('impuestos.retenciones') as FormArray;
    if (retenciones && retenciones.length > 0) {
      retenciones.controls.forEach(retencion => {
        if (retencion.get('selected')?.value) {
          const tasa = retencion.get('tasa')?.value || 0;
          const importeRetencion = importe * tasa;
          retencion.get('importe')?.setValue(importeRetencion, { emitEvent: false });
          totalImpuestos -= importeRetencion;
        }
      });
    }

    concepto.get('impuestosTotal')?.setValue(totalImpuestos, { emitEvent: false });
    concepto.get('total')?.setValue(importe + totalImpuestos, { emitEvent: false });

    this.calculateTotals();
  }

  calculateTotals(): void {
    let subtotal = 0;
    let totalDescuento = 0;
    let totalImpuestos = 0;

    this.conceptos.controls.forEach(concepto => {
      const cantidad = concepto.get('cantidad')?.value || 0;
      const valorUnitario = concepto.get('valorUnitario')?.value || 0;
      const descuento = concepto.get('descuento')?.value || 0;
      const impuestosTotal = concepto.get('impuestosTotal')?.value || 0;

      subtotal += cantidad * valorUnitario;
      totalDescuento += descuento;
      totalImpuestos += impuestosTotal;
    });

    const total = subtotal - totalDescuento + totalImpuestos;

    this.cfdiForm.patchValue({
      subtotal: subtotal,
      descuento: totalDescuento,
      impuestos: totalImpuestos,
      total: total
    }, { emitEvent: false });
  }

  getTraslados(index: number): FormArray {
    const concepto = this.conceptos.at(index);
    return concepto.get('impuestos.traslados') as FormArray;
  }

  getRetenciones(index: number): FormArray {
    const concepto = this.conceptos.at(index);
    return concepto.get('impuestos.retenciones') as FormArray;
  }

  addConcepto(): void {
    const nuevoIndex = this.conceptos.length;
    this.conceptos.push(this.createConcepto());
    
    // ✅ Agregar impuestos al nuevo concepto
    if (this.impuestosUsuario.length > 0) {
      setTimeout(() => {
        this.agregarImpuestosAConcepto(nuevoIndex);
      }, 0);
    }
  }

  removeConcepto(index: number): void {
    if (this.conceptos.length > 1) {
      this.conceptos.removeAt(index);
      this.calculateTotals();
    }
  }

  onSubmit(): void {
    if (this.cfdiForm.invalid) {
      Sweetalert.fnc('error', 'Por favor complete todos los campos requeridos', null);
      this.cfdiForm.markAllAsTouched();
      return;
    }

    // ✅ Validación adicional de contraseña CSD
    const csdPassword = this.cfdiForm.get('csdPassword')?.value;
    if (!csdPassword || csdPassword.trim() === '') {
      Sweetalert.fnc('error', 'La contraseña del certificado CSD es requerida', null);
      return;
    }

    this.loading = true;
    Sweetalert.fnc('loading', 'Generando CFDI...', null);

    try {
      // ✅ Transformar datos del formulario al formato de la API
      const cfdiData = this.transformarDatosParaAPI();
      
      console.log('═══════════════════════════════════════════════');
      console.log('📤 PAYLOAD COMPLETO A ENVIAR AL BACKEND:');
      console.log('═══════════════════════════════════════════════');
      console.log(JSON.stringify(cfdiData, null, 2));
      console.log('═══════════════════════════════════════════════');
      console.log('✅ Emisor:', cfdiData.emisor);
      console.log('✅ Receptor:', cfdiData.receptor);
      console.log('✅ Conceptos:', cfdiData.conceptos);
      console.log('✅ CSD Password incluida:', !!cfdiData.csdPassword);
      console.log('═══════════════════════════════════════════════');

      this.cfdiService.createIngresoCfdi(cfdiData).subscribe({
        next: (response) => {
          this.loading = false;
          Sweetalert.fnc('success', 'CFDI generado y timbrado correctamente', null);
          this.dialogRef.close(response);
        },
        error: (err) => {
          this.loading = false;
          console.error('❌ Error timbrado:', err);

          const errorData = err.error || {};
          
          if (errorData.titulo) {
            Swal.fire({
              icon: 'error',
              title: errorData.titulo,
              html: `
                <p style="font-size: 14px; color: #333;">${errorData.message || 'Error desconocido'}</p>
                ${errorData.campo ? `<p style="font-size: 12px; color: #888; margin-top: 8px;">Campo a revisar: <strong>${errorData.campo}</strong></p>` : ''}
                ${errorData.codigo ? `<p style="font-size: 11px; color: #aaa; margin-top: 4px;">Código: ${errorData.codigo}</p>` : ''}
              `,
              confirmButtonColor: '#8e24aa',
              confirmButtonText: 'Entendido',
            });
          } else {
            const msg = errorData.message || err.message || 'Error al crear el CFDI';
            Sweetalert.fnc('error', msg, null);
          }
        }
          
      });
    } catch (error: any) {
      this.loading = false;
      console.error('❌ Error preparando datos:', error);
      Sweetalert.fnc('error', error.message || 'Error preparando los datos del CFDI', null);
    }
  }

  // ✅ NUEVO: Método para transformar datos al formato de la API
  private transformarDatosParaAPI(): any {
    const formValue = this.cfdiForm.getRawValue();
    
    // ✅ Usar datos del emisor cargados desde BD, si no existen usar localStorage
    const userData = this.datosEmisor || this.obtenerDatosUsuario();

    // ✅ Validar que los datos del emisor existan
    if (!userData.rfc || !userData.nombre) {
      console.error('❌ Datos del emisor incompletos:', userData);
      console.log('📋 datosEmisor:', this.datosEmisor);
      console.log('📋 localStorage:', localStorage.getItem('user'));
      throw new Error('Datos del emisor (RFC y nombre) no están disponibles. Por favor actualice su perfil en la sección "Mi Cuenta".');
    }

    console.log('✅ Datos del emisor a usar:', {
      rfc: userData.rfc,
      nombre: userData.nombre,
      regimenFiscal: userData.fiscalReg
    });
    
    // Transformar conceptos al formato correcto
    const conceptosTransformados = formValue.conceptos.map((concepto: any) => {
      const trasladosSeleccionados = concepto.impuestos?.traslados
        ?.filter((t: any) => t.selected)
        .map((t: any) => ({
          base: concepto.importe,
          impuesto: t.impuesto,
          tipoFactor: 'Tasa',
          tasaOCuota: t.tasa,
          importe: t.importe
        })) || [];
      
      const retencionesSeleccionadas = concepto.impuestos?.retenciones
        ?.filter((r: any) => r.selected)
        .map((r: any) => ({
          base: concepto.importe,
          impuesto: r.impuesto,
          tipoFactor: 'Tasa',
          tasaOCuota: r.tasa,
          importe: r.importe
        })) || [];

      const conceptoTransformado: any = {
        claveProdServ: concepto.claveProdServ,
        cantidad: concepto.cantidad,
        claveUnidad: concepto.claveUnidad,
        unidad: concepto.unidad || 'PZA',
        descripcion: concepto.descripcion,
        valorUnitario: concepto.valorUnitario,
        importe: concepto.importe,
        objetoImp: concepto.objetoImp
      };

      // Solo agregar impuestos si hay al menos uno seleccionado
      if (trasladosSeleccionados.length > 0 || retencionesSeleccionadas.length > 0) {
        conceptoTransformado.impuestos = {};
        
        if (trasladosSeleccionados.length > 0) {
          conceptoTransformado.impuestos.traslados = trasladosSeleccionados;
        }
        
        if (retencionesSeleccionadas.length > 0) {
          conceptoTransformado.impuestos.retenciones = retencionesSeleccionadas;
        }
      }

      return conceptoTransformado;
    });

    // Construir objeto CFDI en el formato esperado
    const cfdiPayload = {
      serie: formValue.serie,
      folio: formValue.folio || this.generarFolioAutomatico(),
      moneda: formValue.moneda,
      tipoCambio: formValue.tipoCambio.toString(),
      exportacion: formValue.exportacion,
      metodoPago: formValue.metodoPago,
      formaPago: formValue.formaPago,
      lugarExpedicion: formValue.lugarExpedicion,
      csdPassword: formValue.csdPassword,  // ✅ Agregar contraseña del certificado
      emisor: {
        rfc: userData.rfc || '',
        nombre: userData.nombre || '',
        regimenFiscal: userData.fiscalReg || '612'
      },
      receptor: {
        rfc: formValue.receptorRfc,
        nombre: formValue.receptorNombre,
        domicilioFiscalReceptor: formValue.receptorDomicilioFiscal,
        regimenFiscalReceptor: formValue.regimenFiscalReceptor,
        usoCFDI: this.validarUsoCFDI(formValue.usoCfdi, formValue.regimenFiscalReceptor)  // ✅ Validar uso CFDI
      },
      conceptos: conceptosTransformados
    };

    return cfdiPayload;
  }

  // ✅ NUEVO: Validar que el uso CFDI sea correcto y compatible con el régimen fiscal
  private validarUsoCFDI(usoCfdi: string, regimenReceptor: string): string {
    console.log('🔍 Validando uso CFDI:', { usoCfdi, regimenReceptor });
    
    // Lista de códigos válidos de uso CFDI
    const usosValidos = [
      'G01', 'G02', 'G03', 'I01', 'I02', 'I03', 'I04', 'I05', 'I06', 'I07', 'I08',
      'D01', 'D02', 'D03', 'D04', 'D05', 'D06', 'D07', 'D08', 'D09', 'D10',
      'P01', 'CP01', 'CN01', 'S01'
    ];
    
    // ✅ Si el valor es un régimen fiscal (números de 3 dígitos), es un error
    if (/^\d{3}$/.test(usoCfdi)) {
      console.error('❌ ERROR: Se detectó un régimen fiscal en lugar de uso CFDI:', usoCfdi);
      console.error('❌ El valor debe ser un código como G01, G02, D01, etc.');
      console.error('❌ Usando valor por defecto: G01');
      return 'G01';
    }
    
    // ✅ Verificar que sea un código válido
    if (!usosValidos.includes(usoCfdi)) {
      console.warn('⚠️ Código de uso CFDI no reconocido:', usoCfdi);
      console.warn('⚠️ Usando valor por defecto: G01');
      return 'G01';
    }
    
    console.log('✅ Uso CFDI válido:', usoCfdi);
    return usoCfdi;
  }

  // ✅ Método auxiliar para generar folio automático si no se proporciona
  private generarFolioAutomatico(): string {
    const timestamp = Date.now();
    return timestamp.toString().slice(-6);
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  // ✅ NUEVO: Método para obtener datos del usuario de forma segura
  private obtenerDatosUsuario(): any {
    // ✅ OPCIÓN 1: Intentar obtener desde localStorage
    let userData: any = null;
    
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        userData = JSON.parse(userStr);
        console.log('📦 Datos desde localStorage:', userData);
      }
    } catch (error) {
      console.error('❌ Error parseando datos de usuario desde localStorage:', error);
    }

    // ✅ Mapear campos que pueden tener diferentes nombres
    if (userData) {
      // Normalizar nombres de campos con TODAS las variaciones posibles
      const datosNormalizados = {
        rfc: userData.rfc || userData.Rfc || userData.RFC || '',
        nombre: userData.nombre || userData.Nombre || userData.nombreComercial || userData.NombreComercial || '',
        fiscalReg: userData.fiscalReg || userData.FiscalReg || userData.regimenFiscal || userData.RegimenFiscal || userData.fiscal_reg || userData.RegFiscal || '612'
      };
      
      console.log('✅ Datos normalizados desde localStorage:', datosNormalizados);
      console.log('🔍 Campos disponibles en localStorage:', Object.keys(userData));
      console.log('🔍 Valores de régimen fiscal en localStorage:', {
        'userData.fiscalReg': userData.fiscalReg,
        'userData.FiscalReg': userData.FiscalReg,
        'userData.regimenFiscal': userData.regimenFiscal,
        'userData.RegimenFiscal': userData.RegimenFiscal,
        'userData.fiscal_reg': userData.fiscal_reg,
        'userData.RegFiscal': userData.RegFiscal,
        'Valor final': datosNormalizados.fiscalReg
      });
      
      // Si tiene al menos RFC y nombre, retornar
      if (datosNormalizados.rfc && datosNormalizados.nombre) {
        return datosNormalizados;
      }
    }

    // ✅ OPCIÓN 2: Si no hay datos válidos, lanzar error claro
    console.error('❌ No se encontraron datos válidos del emisor');
    console.log('📋 Estructura de localStorage:', userData);
    
    return {
      rfc: '',
      nombre: '',
      fiscalReg: '612'
    };
  }
}