import { Component, Inject, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, FormControl, Validators, AbstractControl } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { CFDIService } from '../../../services/cfdi.service';
import { ApibizService } from '../../../services/apibiz.service';
import { SucursalesService } from '../../../services/sucursales.service';
import { Observable, of, Subject } from 'rxjs';
import { map, startWith, takeUntil } from 'rxjs/operators';
import { CFDINomina, CatalogoNomina } from '../../../models/cfdi-nomina.model';
import { Cliente } from '../../../models/cliente.model';
import { Sucursal } from '../../../models/sucursal.model';
import { Sweetalert } from '../../../functions';

@Component({
    selector: 'app-add-cfdi-nomina-modal',
    templateUrl: './add-cfdi-nomina-modal.component.html',
    styleUrls: ['./add-cfdi-nomina-modal.component.css'],
    standalone: false
})
export class AddCfdiNominaModalComponent implements OnInit, OnDestroy {
  generalForm!: FormGroup;
  empleadoForm!: FormGroup;
  partidaForm!: FormGroup;
  nominaForm!: FormGroup;
  cfdiForm: FormGroup;
  activeTab = 'General'; // 'General', 'DatosEmpleado' o 'Partida'
  activePartidaTab = 'Percepciones'; // 'Percepciones', 'Deducciones', 'OtrosPagos'
  loading = false;
  isEditing = false;
  
  // Filtros y observables
  empleadoFilterCtrl = new FormControl('');
  filteredEmpleados!: Observable<any[]>;
  empleados: any[] = [];
  loadingEmpleados = false;
  // Data
  selectedEmpleado: any | null = null;
  empleadosList: any[] = [];
  
  // ✨ NUEVO: Propiedades para sucursales
  sucursales: Sucursal[] = [];
  selectedSucursal: Sucursal | null = null;
  loadingSucursales: boolean = false;
  
  // Catálogos
  tiposNomina: CatalogoNomina[] = [
    { clave: 'O', descripcion: 'Nómina ordinaria' },
    { clave: 'E', descripcion: 'Nómina extraordinaria' }
  ];
  
  tiposContrato: CatalogoNomina[] = [
    { clave: '01', descripcion: 'Contrato de trabajo por tiempo indeterminado' },
    { clave: '02', descripcion: 'Contrato de trabajo por obra determinada' },
    { clave: '03', descripcion: 'Contrato de trabajo por tiempo determinado' },
    { clave: '04', descripcion: 'Contrato de trabajo por temporada' },
    { clave: '05', descripcion: 'Contrato de trabajo sujeto a prueba' },
    { clave: '06', descripcion: 'Contrato de trabajo con capacitación inicial' },
    { clave: '07', descripcion: 'Modalidad de contratación por pago de hora laborada' },
    { clave: '08', descripcion: 'Modalidad de trabajo por comisión laboral' },
    { clave: '09', descripcion: 'Modalidades de contratación donde no existe relación de trabajo' },
    { clave: '10', descripcion: 'Jubilación, pensión, retiro' },
    { clave: '99', descripcion: 'Otro contrato' }
  ];
  
  tiposJornada: CatalogoNomina[] = [
    { clave: '01', descripcion: 'Diurna' },
    { clave: '02', descripcion: 'Nocturna' },
    { clave: '03', descripcion: 'Mixta' },
    { clave: '04', descripcion: 'Por hora' },
    { clave: '05', descripcion: 'Reducida' },
    { clave: '06', descripcion: 'Continuada' },
    { clave: '07', descripcion: 'Partida' },
    { clave: '08', descripcion: 'Por turnos' },
    { clave: '99', descripcion: 'Otra Jornada' }
  ];
  
  regimenesContratacion: CatalogoNomina[] = [
    { clave: '02', descripcion: 'Sueldos y Salarios' },
    { clave: '03', descripcion: 'Jubilados' },
    { clave: '04', descripcion: 'Pensionados' },
    { clave: '05', descripcion: 'Asimilados a salarios miembros sociedades cooperativas' },
    { clave: '06', descripcion: 'Asimilados a salarios integrantes sociedades' },
    { clave: '07', descripcion: 'Asimilados a salarios miembros consejos' },
    { clave: '08', descripcion: 'Asimilados a salarios comisionistas' },
    { clave: '09', descripcion: 'Asimilados a salarios honorarios' },
    { clave: '10', descripcion: 'Asimilados a salarios acciones' },
    { clave: '11', descripcion: 'Asimilados a salarios otros' },
    { clave: '12', descripcion: 'Jubilados o Pensionados' }
  ];
  
  riesgosPuesto: CatalogoNomina[] = [
    { clave: '1', descripcion: 'Clase I' },
    { clave: '2', descripcion: 'Clase II' },
    { clave: '3', descripcion: 'Clase III' },
    { clave: '4', descripcion: 'Clase IV' },
    { clave: '5', descripcion: 'Clase V' }
  ];
  
  bancos: CatalogoNomina[] = [
    { clave: '002', descripcion: 'BANAMEX' },
    { clave: '012', descripcion: 'BBVA BANCOMER' },
    { clave: '014', descripcion: 'SANTANDER' },
    { clave: '021', descripcion: 'HSBC' },
    { clave: '072', descripcion: 'BANORTE' }
  ];
  
  periodicidadesPago: CatalogoNomina[] = [
    { clave: '01', descripcion: 'Diario' },
    { clave: '02', descripcion: 'Semanal' },
    { clave: '03', descripcion: 'Catorcenal' },
    { clave: '04', descripcion: 'Quincenal' },
    { clave: '05', descripcion: 'Mensual' },
    { clave: '06', descripcion: 'Bimestral' },
    { clave: '07', descripcion: 'Unidad obra' },
    { clave: '08', descripcion: 'Comisión' },
    { clave: '09', descripcion: 'Precio alzado' },
    { clave: '10', descripcion: 'Decenal' },
    { clave: '99', descripcion: 'Otra Periodicidad' }
  ];
  
  tiposPercepcion: CatalogoNomina[] = [
    { clave: '001', descripcion: 'Sueldos, Salarios Rayas y Jornales' },
    { clave: '002', descripcion: 'Gratificación Anual (Aguinaldo)' },
    { clave: '003', descripcion: 'Participación de los Trabajadores en las Utilidades PTU' },
    { clave: '004', descripcion: 'Reembolso de Gastos Médicos Dentales y Hospitalarios' },
    { clave: '005', descripcion: 'Fondo de Ahorro' },
    { clave: '009', descripcion: 'Contribuciones a Cargo del Trabajador Pagadas por el Patrón' },
    { clave: '010', descripcion: 'Premios por Puntualidad' },
    { clave: '011', descripcion: 'Prima de Seguro de Vida' },
    { clave: '012', descripcion: 'Seguro de Gastos Médicos Mayores' },
    { clave: '013', descripcion: 'Cuotas Sindicales Pagadas por el Patrón' },
    { clave: '014', descripcion: 'Subsidios por Incapacidad' },
    { clave: '015', descripcion: 'Becas para Trabajadores y/o Hijos' },
    { clave: '019', descripcion: 'Horas Extra' },
    { clave: '020', descripcion: 'Prima Dominical' },
    { clave: '021', descripcion: 'Prima Vacacional' },
    { clave: '022', descripcion: 'Prima por Antigüedad' },
    { clave: '023', descripcion: 'Pagos por Separación' },
    { clave: '025', descripcion: 'Indemnizaciones' },
    { clave: '026', descripcion: 'Reembolso por Funeral' },
    { clave: '027', descripcion: 'Cuotas de Seguridad Social Pagadas por el Patrón' },
    { clave: '028', descripcion: 'Comisiones' },
    { clave: '029', descripcion: 'Vales de Despensa' },
    { clave: '030', descripcion: 'Vales de Restaurante' },
    { clave: '031', descripcion: 'Vales de Gasolina' },
    { clave: '032', descripcion: 'Vales de Ropa' },
    { clave: '033', descripcion: 'Ayuda para Renta' },
    { clave: '034', descripcion: 'Ayuda para Artículos Escolares' },
    { clave: '035', descripcion: 'Ayuda para Anteojos' },
    { clave: '036', descripcion: 'Ayuda para Transporte' },
    { clave: '037', descripcion: 'Ayuda para Gastos de Funeral' },
    { clave: '038', descripcion: 'Otros Ingresos por Salarios' },
    { clave: '039', descripcion: 'Jubilaciones, Pensiones o Haberes de Retiro' },
    { clave: '044', descripcion: 'Jubilaciones, Pensiones o Haberes de Retiro en Parcialidades' },
    { clave: '045', descripcion: 'Ingresos en Acciones o Títulos Valor que Representan Bienes' },
    { clave: '046', descripcion: 'Ingresos Asimilados a Salarios' },
    { clave: '047', descripcion: 'Alimentación' },
    { clave: '048', descripcion: 'Habitación' },
    { clave: '049', descripcion: 'Premios por Asistencia' },
    { clave: '050', descripcion: 'Viáticos' },
    { clave: '051', descripcion: 'Pagos por Gratificaciones, Primas, Compensaciones, Recompensas u Otros' },
    { clave: '052', descripcion: 'Pagos por Jubilaciones en Parcialidades Derivados de la Ejecución de una Resolución Judicial o de un Laudo' },
    { clave: '053', descripcion: 'Pagos por Jubilaciones en una Sola Exhibición Derivados de la Ejecución de una Resolución Judicial o de un Laudo' }
  ];
  
  tiposDeduccion: CatalogoNomina[] = [
    { clave: '001', descripcion: 'Seguridad social' },
    { clave: '002', descripcion: 'ISR' },
    { clave: '003', descripcion: 'Aportaciones a retiro, cesantía en edad avanzada y vejez' },
    { clave: '004', descripcion: 'Otros' },
    { clave: '005', descripcion: 'Aportaciones a Fondo de vivienda' },
    { clave: '006', descripcion: 'Descuento por incapacidad' },
    { clave: '007', descripcion: 'Pensión alimenticia' },
    { clave: '008', descripcion: 'Renta' },
    { clave: '009', descripcion: 'Préstamos provenientes del Fondo Nacional de la Vivienda para los Trabajadores' },
    { clave: '010', descripcion: 'Pago por crédito de vivienda' },
    { clave: '011', descripcion: 'Pago de abonos INFONACOT' },
    { clave: '012', descripcion: 'Anticipo de salarios' },
    { clave: '013', descripcion: 'Pagos hechos con exceso al trabajador' },
    { clave: '014', descripcion: 'Errores' },
    { clave: '015', descripcion: 'Pérdidas' },
    { clave: '016', descripcion: 'Averías' },
    { clave: '017', descripcion: 'Adquisición de artículos producidos por la empresa o establecimiento' },
    { clave: '018', descripcion: 'Cuotas para la constitución y fomento de sociedades cooperativas y de cajas de ahorro' },
    { clave: '019', descripcion: 'Cuotas sindicales' },
    { clave: '020', descripcion: 'Ausencia (Ausentismo)' },
    { clave: '021', descripcion: 'Cuotas obrero patronales' },
    { clave: '022', descripcion: 'Impuestos Locales' },
    { clave: '023', descripcion: 'Aportaciones voluntarias' },
    { clave: '024', descripcion: 'Ajuste en Gratificación Anual (Aguinaldo) Exento' },
    { clave: '025', descripcion: 'Ajuste en Gratificación Anual (Aguinaldo) Gravado' },
    { clave: '026', descripcion: 'Ajuste en Participación de los Trabajadores en las Utilidades PTU Exento' },
    { clave: '027', descripcion: 'Ajuste en Participación de los Trabajadores en las Utilidades PTU Gravado' },
    { clave: '028', descripcion: 'Ajuste en Reembolso de Gastos Médicos Dentales y Hospitalarios Exento' },
    { clave: '029', descripcion: 'Ajuste en Fondo de ahorro Exento' },
    { clave: '030', descripcion: 'Ajuste en Caja de ahorro Exento' },
    { clave: '031', descripcion: 'Ajuste en Contribuciones a Cargo del Trabajador Pagadas por el Patrón Exento' },
    { clave: '032', descripcion: 'Ajuste en Premios por puntualidad Gravado' },
    { clave: '033', descripcion: 'Ajuste en Prima de Seguro de vida Exento' },
    { clave: '034', descripcion: 'Ajuste en Seguro de Gastos Médicos Mayores Exento' },
    { clave: '035', descripcion: 'Ajuste en Cuotas Sindicales Pagadas por el Patrón Exento' },
    { clave: '036', descripcion: 'Ajuste en Subsidios por incapacidad Exento' },
    { clave: '037', descripcion: 'Ajuste en Becas para trabajadores y/o hijos Exento' },
    { clave: '038', descripcion: 'Ajuste en Horas extra Exento' },
    { clave: '039', descripcion: 'Ajuste en Horas extra Gravado' },
    { clave: '040', descripcion: 'Ajuste en Prima dominical Exento' },
    { clave: '041', descripcion: 'Ajuste en Prima dominical Gravado' },
    { clave: '042', descripcion: 'Ajuste en Prima vacacional Exento' },
    { clave: '043', descripcion: 'Ajuste en Prima vacacional Gravado' },
    { clave: '044', descripcion: 'Ajuste en Prima por antigüedad Exento' },
    { clave: '045', descripcion: 'Ajuste en Prima por antigüedad Gravado' },
    { clave: '046', descripcion: 'Ajuste en Pagos por separación Exento' },
    { clave: '047', descripcion: 'Ajuste en Pagos por separación Gravado' },
    { clave: '048', descripcion: 'Ajuste en Seguro de retiro Exento' },
    { clave: '049', descripcion: 'Ajuste en Indemnizaciones Exento' },
    { clave: '050', descripcion: 'Ajuste en Indemnizaciones Gravado' },
    { clave: '051', descripcion: 'Ajuste en Reembolso por funeral Exento' },
    { clave: '052', descripcion: 'Ajuste en Cuotas de seguridad social pagadas por el patrón Exento' },
    { clave: '053', descripcion: 'Ajuste en Comisiones Gravado' },
    { clave: '054', descripcion: 'Ajuste en Vales de despensa Exento' },
    { clave: '055', descripcion: 'Ajuste en Vales de restaurante Exento' },
    { clave: '056', descripcion: 'Ajuste en Vales de gasolina Exento' },
    { clave: '057', descripcion: 'Ajuste en Vales de ropa Exento' },
    { clave: '058', descripcion: 'Ajuste en Ayuda para renta Exento' },
    { clave: '059', descripcion: 'Ajuste en Ayuda para artículos escolares Exento' },
    { clave: '060', descripcion: 'Ajuste en Ayuda para anteojos Exento' },
    { clave: '061', descripcion: 'Ajuste en Ayuda para transporte Exento' },
    { clave: '062', descripcion: 'Ajuste en Ayuda para gastos de funeral Exento' },
    { clave: '063', descripcion: 'Ajuste en Otros ingresos por salarios Exento' },
    { clave: '064', descripcion: 'Ajuste en Otros ingresos por salarios Gravado' },
    { clave: '065', descripcion: 'Ajuste en Jubilaciones, pensiones o haberes de retiro Exento' },
    { clave: '066', descripcion: 'Ajuste en Jubilaciones, pensiones o haberes de retiro Gravado' },
    { clave: '067', descripcion: 'Ajuste en Pagos por separación Acumulable' },
    { clave: '068', descripcion: 'Ajuste en Pagos por separación No acumulable' },
    { clave: '069', descripcion: 'Ajuste en Jubilaciones, pensiones o haberes de retiro Acumulable' },
    { clave: '070', descripcion: 'Ajuste en Jubilaciones, pensiones o haberes de retiro No acumulable' },
    { clave: '071', descripcion: 'Ajuste en Subsidio para el empleo (efectivamente entregado al trabajador)' },
    { clave: '072', descripcion: 'Ajuste en Ingresos en acciones o títulos valor que representan bienes Exento' },
    { clave: '073', descripcion: 'Ajuste en Ingresos en acciones o títulos valor que representan bienes Gravado' },
    { clave: '074', descripcion: 'Ajuste en Alimentación Exento' },
    { clave: '075', descripcion: 'Ajuste en Alimentación Gravado' },
    { clave: '076', descripcion: 'Ajuste en Habitación Exento' },
    { clave: '077', descripcion: 'Ajuste en Habitación Gravado' },
    { clave: '078', descripcion: 'Ajuste en Premios por asistencia' },
    { clave: '079', descripcion: 'Ajuste en Pagos distintos a los listados y que no deben considerarse como ingreso por sueldos, salarios o ingresos asimilados.' },
    { clave: '080', descripcion: 'Ajuste en Viáticos gravados' },
    { clave: '081', descripcion: 'Ajuste en Viáticos (entregados al trabajador)' },
    { clave: '082', descripcion: 'Ajuste en Fondo de ahorro Gravado' },
    { clave: '083', descripcion: 'Ajuste en Caja de ahorro Gravado' },
    { clave: '084', descripcion: 'Ajuste en Prima de Seguro de vida Gravado' },
    { clave: '085', descripcion: 'Ajuste en Seguro de Gastos Médicos Mayores Gravado' },
    { clave: '086', descripcion: 'Ajuste en Subsidios por incapacidad Gravado' },
    { clave: '087', descripcion: 'Ajuste en Becas para trabajadores y/o hijos Gravado' },
    { clave: '088', descripcion: 'Ajuste en Seguro de retiro Gravado' },
    { clave: '089', descripcion: 'Ajuste en Vales de despensa Gravado' },
    { clave: '090', descripcion: 'Ajuste en Vales de restaurante Gravado' },
    { clave: '091', descripcion: 'Ajuste en Vales de gasolina Gravado' },
    { clave: '092', descripcion: 'Ajuste en Vales de ropa Gravado' },
    { clave: '093', descripcion: 'Ajuste en Ayuda para renta Gravado' },
    { clave: '094', descripcion: 'Ajuste en Ayuda para artículos escolares Gravado' },
    { clave: '095', descripcion: 'Ajuste en Ayuda para anteojos Gravado' },
    { clave: '096', descripcion: 'Ajuste en Ayuda para transporte Gravado' },
    { clave: '097', descripcion: 'Ajuste en Ayuda para gastos de funeral Gravado' },
    { clave: '098', descripcion: 'Ajuste a ingresos asimilados a salarios gravados' },
    { clave: '099', descripcion: 'Ajuste a ingresos por sueldos y salarios gravados' },
    { clave: '100', descripcion: 'Ajuste en Viáticos exentos' },
    { clave: '101', descripcion: 'ISR Retenido de ejercicio anterior' },
    { clave: '102', descripcion: 'Ajuste a pagos por gratificaciones, primas, compensaciones, recompensas u otros a extrabajadores derivados de jubilación en parcialidades, gravados' },
    { clave: '103', descripcion: 'Ajuste a pagos que se realizan a extrabajadores que obtienen una jubilación en parcialidades derivados de la ejecución de una resolución judicial o de un laudo gravados' },
    { clave: '104', descripcion: 'Ajuste a pagos que se realizan a extrabajadores que obtienen una jubilación en parcialidades derivados de la ejecución de una resolución judicial o de un laudo exentos' },
    { clave: '105', descripcion: 'Ajuste a pagos que se realizan a extrabajadores que obtienen una jubilación en una sola exhibición derivados de la ejecución de una resolución judicial o de un laudo gravados' },
    { clave: '106', descripcion: 'Ajuste a pagos que se realizan a extrabajadores que obtienen una jubilación en una sola exhibición derivados de la ejecución de una resolución judicial o de un laudo exentos' },
    { clave: '107', descripcion: 'Ajuste al Subsidio Causado' }
  ];
  
  tiposOtroPago: CatalogoNomina[] = [
    { clave: '001', descripcion: 'Reintegro de ISR pagado en exceso' },
    { clave: '002', descripcion: 'Subsidio para el empleo' },
    { clave: '003', descripcion: 'Viáticos' },
    { clave: '004', descripcion: 'Aplicación de saldo a favor por compensación anual' },
    { clave: '005', descripcion: 'Reintegro de ISR retenido en exceso de ejercicio anterior' },
    { clave: '999', descripcion: 'Pagos distintos a los listados y que no deben considerarse como ingreso por sueldos, salarios o ingresos asimilados' }
  ];
  
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<AddCfdiNominaModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private cfdiService: CFDIService,
    private apibizService: ApibizService,
    private sucursalesService: SucursalesService
  ) {
    this.isEditing = data?.isEditing || false;
    
    // Inicializar el formulario
    this.cfdiForm = this.fb.group({
      // Datos generales
      ID: [null],
      serie: ['A', Validators.required],
      folio: [{ value: '', disabled: true }],
      fecha: [new Date(), Validators.required],
      tipo: ['Nomina', Validators.required],
      
      // Datos de emisor
      sucursal: ['Matriz'],
      tipoPago: ['PUE', Validators.required], // Pago único por defecto
      moneda: ['MXN', Validators.required],
      registroPatronal: ['', Validators.required],
      
      // Datos específicos de la nómina
      tipoNomina: ['O', Validators.required], // Ordinaria por defecto
      fechaPago: [new Date(), Validators.required],
      fechaInicialPago: [new Date()],
      fechaFinalPago: [new Date()],
      diasPagados: [0, [Validators.required, Validators.min(0)]],
      
      // ✨ NUEVO: ID del empleado en el formulario principal (como clienteId en CFDI)
      empleadoId: [null, Validators.required],
      
      // Datos del empleado
      empleado: this.fb.group({
        ID: [null, Validators.required], // ✅ Agregado Validators.required
        numeroEmpleado: ['', Validators.required],
        curp: ['', Validators.required],
        rfc: ['', Validators.required],
        nombre: ['', Validators.required],
        departamento: [''],
        puesto: [''],
        numSeguridadSocial: [''],
        antiguedad: [''],
        clabe: [''],
        banco: [''],
        fechaInicioRelacionLaboral: [null],
        tipoContrato: ['01', Validators.required], // Indeterminado por defecto
        tipoJornada: ['01', Validators.required], // Diurna por defecto
        salarioBaseCotizacion: [0],
        salarioDiarioIntegrado: [0],
        regimenContratacion: ['02', Validators.required], // Sueldos por defecto
        riesgoPuesto: ['1']
      }),
      
      // Percepciones
      percepciones: this.fb.array([]),
      
      // Deducciones
      deducciones: this.fb.array([]),
      
      // Otros pagos
      otrosPagos: this.fb.array([]),
      
      // Totales
      totalPercepciones: [0],
      totalDeducciones: [0],
      totalOtrosPagos: [0],
      total: [0],
      
      // Datos adicionales
      observaciones: [''],
      csdPassword: ['', [Validators.required, Validators.minLength(1)]]
    });
  }

  ngOnInit(): void {
  this.initializeForms();
  
  this.nominaForm = this.fb.group({
    general: this.generalForm,
    empleado: this.empleadoForm,
    partida: this.partidaForm
  });
  
  this.loadEmpleados();
  this.loadSucursales(); 
}
  private initializeForms(): void {
  // CFDI Form principal (para tab General y Partida)
  this.cfdiForm = this.fb.group({
    // Campos del tab General
    sucursal: [null], // <-- Asegúrate que esté aquí
    serie: ['', Validators.required],
    fecha: [new Date(), Validators.required],
    tipoNomina: ['', Validators.required],
    moneda: ['MXN', Validators.required],
    registroPatronal: ['', Validators.required],
    fechaPago: [new Date(), Validators.required],
    fechaInicialPago: [null],
    fechaFinalPago: [null],
    diasPagados: [0, Validators.required],
    observaciones: [''],
    
    // Arrays para partidas
    percepciones: this.fb.array([]),
    deducciones: this.fb.array([]),
    otrosPagos: this.fb.array([]),
    
    // Totales
    totalPercepciones: [0],
    totalDeducciones: [0],
    totalOtrosPagos: [0],
    total: [0],
    
    // Contraseña CSD global
    csdPassword: ['', Validators.required]
  });

  // Empleado Form (para tab Datos Empleado)
  this.empleadoForm = this.fb.group({
    empleado: [null, Validators.required],
    numeroEmpleado: ['', Validators.required],
    rfc: ['', Validators.required],
    curp: ['', Validators.required],
    nombre: ['', Validators.required],
    departamento: [''],
    puesto: [''],
    numSeguridadSocial: [''],
    fechaInicioRelacionLaboral: [null],
    antiguedad: [''],
    banco: [''],
    clabe: [''],
    tipoContrato: ['', Validators.required],
    tipoJornada: ['', Validators.required],
    regimenContratacion: ['', Validators.required],
    riesgoPuesto: [''],
    salarioBaseCotizacion: [0],
    salarioDiarioIntegrado: [0],
    contrasenaCertificado: ['', Validators.required]
  });

  // Partida Form (si lo necesitas separado)
  this.partidaForm = this.fb.group({});
}
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  // Carga los empleados desde el servicio
  loadEmpleados() {
  this.loadingEmpleados = true;
  this.apibizService.getEmpleados()
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (empleados) => {
        console.log('✅ Empleados cargados:', empleados.length);
        
        // Guardar la lista completa
        this.empleados = empleados; // <-- Cambiar de empleadosList a empleados
        
        // Configurar el filtro de empleados
        this.filteredEmpleados = this.empleadoFilterCtrl.valueChanges.pipe(
          startWith(''),
          map(value => this._filterEmpleados(value || ''))
        );
        
        this.loadingEmpleados = false;
      },
      error: (error) => {
        console.error('❌ Error al cargar empleados:', error);
        Sweetalert.fnc('error', 'Error al cargar los empleados', null);
        this.loadingEmpleados = false;
      }
    });
}
  
  // Filtro de empleados
  private _filterEmpleados(value: string): any[] {
  if (!this.empleados || this.empleados.length === 0) {
    return [];
  }
  
  const filterValue = value.toLowerCase();
  return this.empleados.filter(emp => {
    const nombreCompleto = `${emp.nombre} ${emp.apellidoPaterno} ${emp.apellidoMaterno}`.toLowerCase();
    return nombreCompleto.includes(filterValue);
  });
}
  
  // ✨ NUEVO: Cargar todas las sucursales disponibles
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
          console.error('Error al cargar sucursales:', error);
          this.loadingSucursales = false;
        }
      });
  }
  
  // ✨ NUEVO: Método para manejar selección de sucursal
  onSucursalSelect(event: any): void {
    const sucursalId = event.value;
    
    if (sucursalId === null) {
      this.selectedSucursal = null;
    } else {
      const sucursal = this.sucursales.find(s => s.id === sucursalId);
      if (sucursal) {
        this.selectedSucursal = sucursal;
        console.log('Sucursal seleccionada:', this.selectedSucursal);
      }
    }
  }
  
  // ✨ NUEVO: Método alternativo que recibe directamente el ID
  onEmpleadoSelectById(selectedEmpleadoId: any): void {
    console.log('🎯 onEmpleadoSelectById ejecutado');
    console.log('🔍 ID recibido:', selectedEmpleadoId);
    console.log('📋 Tipo de ID:', typeof selectedEmpleadoId);
    console.log('📋 Lista de empleados disponibles:', this.empleadosList.length);
    
    if (this.empleadosList.length === 0) {
      console.log('⚠️ La lista de empleados está vacía');
      return;
    }
    
    // Buscar en la lista almacenada - probar con diferentes comparaciones
    let selectedEmpleado = this.empleadosList.find(
      empleado => empleado.ID === selectedEmpleadoId
    );
    
    // Si no se encuentra, intentar con conversión de tipos
    if (!selectedEmpleado) {
      console.log('⚠️ No encontrado con ===, intentando con conversión...');
      selectedEmpleado = this.empleadosList.find(
        empleado => empleado.ID == selectedEmpleadoId || 
                    String(empleado.ID) === String(selectedEmpleadoId) ||
                    Number(empleado.ID) === Number(selectedEmpleadoId)
      );
    }
    
    if (selectedEmpleado) {
      this.selectedEmpleado = selectedEmpleado;
      console.log('✅ Empleado encontrado y asignado:', this.selectedEmpleado);
      
      // Llenar los datos del empleado en el formulario
      const empleadoForm = this.cfdiForm.get('empleado') as FormGroup;
      if (empleadoForm) {
        const datosEmpleado = {
          ID: selectedEmpleado.ID,
          numeroEmpleado: selectedEmpleado.numeroEmpleado || '',
          curp: selectedEmpleado.curp || '',
          rfc: selectedEmpleado.rfc || '',
          nombre: selectedEmpleado.nombre || '',
          departamento: selectedEmpleado.departamento || '',
          puesto: selectedEmpleado.puesto || '',
          numSeguridadSocial: selectedEmpleado.numSeguridadSocial || '',
          antiguedad: selectedEmpleado.antiguedad || '',
          clabe: selectedEmpleado.clabe || '',
          banco: selectedEmpleado.banco || '',
          fechaInicioRelacionLaboral: selectedEmpleado.fechaInicioRelacionLaboral || null,
          tipoContrato: selectedEmpleado.tipoContrato || '01',
          tipoJornada: selectedEmpleado.tipoJornada || '01',
          salarioBaseCotizacion: selectedEmpleado.salarioBaseCotizacion || 0,
          salarioDiarioIntegrado: selectedEmpleado.salarioDiarioIntegrado || 0,
          regimenContratacion: selectedEmpleado.regimenContratacion || '02',
          riesgoPuesto: selectedEmpleado.riesgoPuesto || '1'
        };
        
        empleadoForm.patchValue(datosEmpleado);
        console.log('📝 Formulario actualizado con:', datosEmpleado);
        console.log('✅ Estado del formControl ID:', empleadoForm.get('ID')?.value);
        console.log('✅ Validez del formGroup empleado:', empleadoForm.valid);
        
        // Marcar los campos como touched para que se muestren los errores si los hay
        Object.keys(empleadoForm.controls).forEach(key => {
          empleadoForm.get(key)?.markAsTouched();
        });
      }
    } else {
      console.log('❌ No se encontró el empleado con ID:', selectedEmpleadoId);
      console.log('📋 IDs disponibles:', this.empleadosList.map(e => `${e.ID} (${typeof e.ID})`));
      if (this.empleadosList.length > 0) {
        console.log('📋 Primer empleado de ejemplo:', this.empleadosList[0]);
      }
    }
  }
  
  // ✨ NUEVO: Método EXACTAMENTE como onClienteSelect
  onEmpleadoSelectChange(event: any): void {
    console.log('🎯🎯🎯 onEmpleadoSelectChange EJECUTADO 🎯🎯🎯');
    const selectedEmpleadoId = event.value;
    console.log('ID seleccionado:', selectedEmpleadoId);
    
    if (selectedEmpleadoId && this.empleadosList.length > 0) {
      const empleado = this.empleadosList.find(e => e.ID === selectedEmpleadoId);
      console.log('Empleado encontrado:', empleado);
      
      if (empleado) {
        this.selectedEmpleado = empleado;
        console.log('✅ selectedEmpleado asignado');
        
        // Actualizar el formulario del empleado
        const empleadoForm = this.cfdiForm.get('empleado') as FormGroup;
        if (empleadoForm) {
          empleadoForm.patchValue({
            ID: empleado.ID,
            numeroEmpleado: empleado.numeroEmpleado || '',
            curp: empleado.curp || '',
            rfc: empleado.rfc || '',
            nombre: empleado.nombre || '',
            departamento: empleado.departamento || '',
            puesto: empleado.puesto || '',
            numSeguridadSocial: empleado.numSeguridadSocial || '',
            antiguedad: empleado.antiguedad || '',
            clabe: empleado.clabe || '',
            banco: empleado.banco || '',
            fechaInicioRelacionLaboral: empleado.fechaInicioRelacionLaboral || null,
            tipoContrato: empleado.tipoContrato || '01',
            tipoJornada: empleado.tipoJornada || '01',
            salarioBaseCotizacion: empleado.salarioBaseCotizacion || 0,
            salarioDiarioIntegrado: empleado.salarioDiarioIntegrado || 0,
            regimenContratacion: empleado.regimenContratacion || '02',
            riesgoPuesto: empleado.riesgoPuesto || '1'
          });
          console.log('✅ Formulario actualizado');
        }
      }
    }
  }
  
  // ✨ NUEVO: Manejador directo cuando se hace clic en una opción
  handleEmpleadoOptionClick(empleado: any): void {
    console.log('🎯🎯🎯 handleEmpleadoOptionClick EJECUTADO 🎯🎯🎯');
    console.log('Empleado clickeado:', empleado);
    
    // Asignar directamente
    this.selectedEmpleado = empleado;
    
    // Actualizar el formulario
    const empleadoForm = this.cfdiForm.get('empleado') as FormGroup;
    if (empleadoForm && empleado) {
      empleadoForm.patchValue({
        ID: empleado.ID,
        numeroEmpleado: empleado.numeroEmpleado || '',
        curp: empleado.curp || '',
        rfc: empleado.rfc || '',
        nombre: empleado.nombre || '',
        departamento: empleado.departamento || '',
        puesto: empleado.puesto || '',
        numSeguridadSocial: empleado.numSeguridadSocial || '',
        antiguedad: empleado.antiguedad || '',
        clabe: empleado.clabe || '',
        banco: empleado.banco || '',
        fechaInicioRelacionLaboral: empleado.fechaInicioRelacionLaboral || null,
        tipoContrato: empleado.tipoContrato || '01',
        tipoJornada: empleado.tipoJornada || '01',
        salarioBaseCotizacion: empleado.salarioBaseCotizacion || 0,
        salarioDiarioIntegrado: empleado.salarioDiarioIntegrado || 0,
        regimenContratacion: empleado.regimenContratacion || '02',
        riesgoPuesto: empleado.riesgoPuesto || '1'
      });
      console.log('✅ Empleado asignado y formulario actualizado');
    }
  }
  
  // ✨ NUEVO: Método alternativo con ngModelChange
  onEmpleadoModelChange(selectedEmpleadoId: any): void {
    console.log('🔥🔥🔥 onEmpleadoModelChange EJECUTADO 🔥🔥🔥');
    console.log('ID desde ngModelChange:', selectedEmpleadoId);
    if (selectedEmpleadoId) {
      this.onEmpleadoSelectById(selectedEmpleadoId);
    }
  }
  
  // Evento al seleccionar un empleado (mantener por compatibilidad)
  onEmpleadoSelect(empleadoId: string): void {
  console.log('Empleado seleccionado ID:', empleadoId);
  
  if (empleadoId) {
    // Buscar el empleado en la lista
    this.selectedEmpleado = this.empleados.find(emp => emp.id === empleadoId);
    console.log('Empleado encontrado:', this.selectedEmpleado);
    
    // Prellenar el formulario con los datos del empleado
    if (this.selectedEmpleado) {
      this.nominaForm.get('empleado')?.patchValue({
        numeroEmpleado: this.selectedEmpleado.numeroEmpleado || '',
        rfc: this.selectedEmpleado.rfc || '',
        curp: this.selectedEmpleado.curp || '',
        nombre: `${this.selectedEmpleado.nombre} ${this.selectedEmpleado.apellidoPaterno} ${this.selectedEmpleado.apellidoMaterno}`,
        departamento: this.selectedEmpleado.departamento || '',
        puesto: this.selectedEmpleado.puesto || '',
        numSeguridadSocial: this.selectedEmpleado.nss || '',
        fechaInicioRelacionLaboral: this.selectedEmpleado.fechaInicioRelacionLaboral || null,
        antiguedad: this.selectedEmpleado.antiguedad || '',
        banco: this.selectedEmpleado.banco || '',
        clabe: this.selectedEmpleado.clabe || '',
        tipoContrato: this.selectedEmpleado.tipoContrato || '',
        tipoJornada: this.selectedEmpleado.tipoJornada || '',
        regimenContratacion: this.selectedEmpleado.regimenContratacion || '',
        riesgoPuesto: this.selectedEmpleado.riesgoPuesto || '',
        salarioBaseCotizacion: this.selectedEmpleado.salarioBaseCotizacion || 0,
        salarioDiarioIntegrado: this.selectedEmpleado.salarioDiarioIntegrado || 0
      });
      
      // 🆕 Cargar percepciones del empleado
      this.cargarPercepcionesEmpleado(this.selectedEmpleado.percepciones);
      
      // 🆕 Cargar deducciones del empleado
      this.cargarDeduccionesEmpleado(this.selectedEmpleado.deducciones);
    }
  } else {
    this.selectedEmpleado = null;
  }
}

// 🆕 Método para cargar percepciones
 cargarPercepcionesEmpleado(percepciones: any): void {
  // Limpiar percepciones actuales
  while (this.percepciones.length) {
    this.percepciones.removeAt(0);
  }
  
  // Parsear el JSON si viene como string
  let percepcionesArray: any[] = []; // <-- Agregar tipo any[]
  if (typeof percepciones === 'string') {
    try {
      percepcionesArray = JSON.parse(percepciones);
    } catch (e) {
      console.error('Error al parsear percepciones:', e);
      return;
    }
  } else if (Array.isArray(percepciones)) {
    percepcionesArray = percepciones;
  }
  
  // Agregar cada percepción al FormArray
  percepcionesArray.forEach((percepcion: any) => {
    const percepcionGroup = this.fb.group({
      tipo: [percepcion.tipo || '', Validators.required],
      clave: [percepcion.clave || '', Validators.required],
      concepto: [percepcion.concepto || '', Validators.required],
      importeGravado: [percepcion.importeGravado || 0, Validators.required],
      importeExento: [percepcion.importeExento || 0, Validators.required]
    });
    
    this.percepciones.push(percepcionGroup);
  });
  
  // Recalcular totales
  this.calcularTotales();
  
  console.log('✅ Percepciones cargadas:', percepcionesArray.length);
}

// 🆕 Método para cargar deducciones
 cargarDeduccionesEmpleado(deducciones: any): void {
  // Limpiar deducciones actuales
  while (this.deducciones.length) {
    this.deducciones.removeAt(0);
  }
  
  // Parsear el JSON si viene como string
  let deduccionesArray: any[] = [];
  if (typeof deducciones === 'string') {
    try {
      deduccionesArray = JSON.parse(deducciones);
    } catch (e) {
      console.error('Error al parsear deducciones:', e);
      return;
    }
  } else if (Array.isArray(deducciones)) {
    deduccionesArray = deducciones;
  }
  
  // Agregar cada deducción al FormArray
  deduccionesArray.forEach((deduccion: any) => {
    const deduccionGroup = this.fb.group({
      tipo: [deduccion.tipo || deduccion.clave || '', Validators.required],
      clave: [deduccion.clave || '', Validators.required],
      concepto: [deduccion.concepto || '', Validators.required],
      importeGravado: [deduccion.importeGravado || 0, Validators.required],
      importeExento: [deduccion.importeExento || 0, Validators.required]
    });
    
    this.deducciones.push(deduccionGroup);
  });
  
  // Recalcular totales
  this.calcularTotales();
  
  console.log('✅ Deducciones cargadas:', deduccionesArray.length);
}
  
  // Getters para acceder a los FormArrays
  get percepciones(): FormArray {
    return this.cfdiForm.get('percepciones') as FormArray;
  }
  
  get deducciones(): FormArray {
    return this.cfdiForm.get('deducciones') as FormArray;
  }
  
  get otrosPagos(): FormArray {
    return this.cfdiForm.get('otrosPagos') as FormArray;
  }
  onOtroPagoTipoChange(tipoClave: string, index: number): void {
  // Buscar el tipo seleccionado en el catálogo
  const tipoSeleccionado = this.tiposOtroPago.find(tipo => tipo.clave === tipoClave);
  
  if (tipoSeleccionado) {
    // Obtener el FormGroup del otro pago específico
    const otroPagoGroup = this.otrosPagos.at(index) as FormGroup;
    
    // Actualizar los campos de clave y concepto
    otroPagoGroup.patchValue({
      clave: tipoSeleccionado.clave,
      concepto: tipoSeleccionado.descripcion
    });
    
    console.log(`✅ Otro pago ${index + 1} actualizado:`, {
      tipo: tipoClave,
      clave: tipoSeleccionado.clave,
      concepto: tipoSeleccionado.descripcion
    });
  }
}
  
  // Crear una percepción nueva
  createPercepcion(): FormGroup {
    return this.fb.group({
      tipo: ['001', Validators.required], // Sueldos y Salarios por defecto
      clave: ['', Validators.required],
      concepto: ['', Validators.required],
      importeGravado: [0, [Validators.required, Validators.min(0)]],
      importeExento: [0, [Validators.required, Validators.min(0)]]
    });
  }
  
  // Crear una deducción nueva
  createDeduccion(): FormGroup {
    return this.fb.group({
      tipo: ['002', Validators.required], // ISR por defecto
      clave: ['', Validators.required],
      concepto: ['', Validators.required],
      importe: [0, [Validators.required, Validators.min(0)]]
    });
  }
  
  // Crear otro pago nuevo
  createOtroPago(): FormGroup {
    return this.fb.group({
      tipo: ['002', Validators.required], // Subsidio para el empleo por defecto
      clave: ['', Validators.required],
      concepto: ['', Validators.required],
      importe: [0, [Validators.required, Validators.min(0)]]
    });
  }
  
  // Añadir una nueva percepción
  addPercepcion(): void {
    const percepcionForm = this.createPercepcion();
    this.percepciones.push(percepcionForm);
  }
  
  // Añadir una nueva deducción
  addDeduccion(): void {
  const deduccionGroup = this.fb.group({
    tipo: ['', Validators.required],
    clave: ['', Validators.required],
    concepto: ['', Validators.required],
    importeGravado: [0, Validators.required],
    importeExento: [0, Validators.required]
  });
  
  this.deducciones.push(deduccionGroup);
}
  
  // Añadir un nuevo otro pago
  addOtroPago(): void {
    const otroPagoForm = this.createOtroPago();
    this.otrosPagos.push(otroPagoForm);
  }
  
  // Eliminar una percepción
  removePercepcion(index: number): void {
    this.percepciones.removeAt(index);
    this.calcularTotales();
  }
  
  // Eliminar una deducción
  removeDeduccion(index: number): void {
    this.deducciones.removeAt(index);
    this.calcularTotales();
  }
  
  // Eliminar un otro pago
  removeOtroPago(index: number): void {
    this.otrosPagos.removeAt(index);
    this.calcularTotales();
  }
  
  
  // Método para cambiar tipo de deducción
onDeduccionTipoChange(tipoClave: string, index: number): void {
  const tipoSeleccionado = this.tiposDeduccion.find(tipo => tipo.clave === tipoClave);
  
  if (tipoSeleccionado) {
    const deduccionGroup = this.deducciones.at(index) as FormGroup;
    deduccionGroup.patchValue({
      clave: tipoSeleccionado.clave,
      concepto: tipoSeleccionado.descripcion
    });
    
    console.log(`✅ Deducción ${index + 1} actualizada:`, {
      tipo: tipoClave,
      clave: tipoSeleccionado.clave,
      concepto: tipoSeleccionado.descripcion
    });
  }
}

// Cambiar de private a public
calcularTotales(): void {
  // Calcular total de percepciones
  let totalPercepciones = 0;
  this.percepciones.controls.forEach(control => {
    const gravado = parseFloat(control.get('importeGravado')?.value || 0);
    const exento = parseFloat(control.get('importeExento')?.value || 0);
    totalPercepciones += gravado + exento;
  });
  
  // Calcular total de deducciones
  let totalDeducciones = 0;
  this.deducciones.controls.forEach(control => {
    const gravado = parseFloat(control.get('importeGravado')?.value || 0);
    const exento = parseFloat(control.get('importeExento')?.value || 0);
    totalDeducciones += gravado + exento;
  });
  
  // Calcular total de otros pagos
  let totalOtrosPagos = 0;
  this.otrosPagos.controls.forEach(control => {
    const importe = parseFloat(control.get('importe')?.value || 0);
    totalOtrosPagos += importe;
  });
  
  // Calcular total final
  const total = totalPercepciones - totalDeducciones + totalOtrosPagos;
  
  // Actualizar valores en el formulario
  this.cfdiForm.patchValue({
    totalPercepciones: totalPercepciones,
    totalDeducciones: totalDeducciones,
    totalOtrosPagos: totalOtrosPagos,
    total: total
  });
  
  console.log('📊 Totales calculados:', {
    percepciones: totalPercepciones,
    deducciones: totalDeducciones,
    otrosPagos: totalOtrosPagos,
    total: total
  });
}
  // Cambiar de pestaña
  changeTab(tab: string): void {
    this.activeTab = tab;
  }
  
  // Cambiar de pestaña en la sección de partida
  changePartidaTab(tab: string): void {
    this.activePartidaTab = tab;
  }
  
  // Función auxiliar para verificar formularios
  isInvalid(controlName: string): boolean {
    const control = this.cfdiForm.get(controlName);
    return control ? control.invalid && (control.dirty || control.touched) : false;
  }
  
  // Función auxiliar para verificar formularios anidados
  isInvalidNested(groupName: string, controlName: string): boolean {
    const group = this.cfdiForm.get(groupName);
    if (!group) return false;
    
    const control = group.get(controlName);
    return control ? control.invalid && (control.dirty || control.touched) : false;
  }
  
  // Poblar el formulario con datos existentes (para edición)
  populateForm(cfdi: CFDINomina): void {
    // Datos generales
    this.cfdiForm.patchValue({
      ID: cfdi.ID,
      serie: cfdi.serie,
      fechaPago: cfdi.fechaPago,
      // Otros campos según la estructura de tu CFDI
    });
    
    // Datos del empleado
    const empleadoForm = this.cfdiForm.get('empleado');
    if (empleadoForm && cfdi.empleado) {
      empleadoForm.patchValue(cfdi.empleado);
      this.selectedEmpleado = cfdi.empleado;
    }
    
    // Percepciones
    if (cfdi.percepciones && cfdi.percepciones.length > 0) {
      // Limpiar el array existente
      while (this.percepciones.length !== 0) {
        this.percepciones.removeAt(0);
      }
      
      // Añadir cada percepción
      cfdi.percepciones.forEach(percepcion => {
        const percepcionForm = this.createPercepcion();
        percepcionForm.patchValue(percepcion);
        this.percepciones.push(percepcionForm);
      });
    } else {
      this.addPercepcion(); // Agregar una percepción vacía
    }
    
    // Deducciones
    if (cfdi.deducciones && cfdi.deducciones.length > 0) {
      // Limpiar el array existente
      while (this.deducciones.length !== 0) {
        this.deducciones.removeAt(0);
      }
      
      // Añadir cada deducción
      cfdi.deducciones.forEach(deduccion => {
        const deduccionForm = this.createDeduccion();
        deduccionForm.patchValue(deduccion);
        this.deducciones.push(deduccionForm);
      });
    } else {
      this.addDeduccion(); // Agregar una deducción vacía
    }
    
    // Otros pagos
    if (cfdi.otrosPagos && cfdi.otrosPagos.length > 0) {
      // Limpiar el array existente
      while (this.otrosPagos.length !== 0) {
        this.otrosPagos.removeAt(0);
      }
      
      // Añadir cada otro pago
      cfdi.otrosPagos.forEach(otroPago => {
        const otroPagoForm = this.createOtroPago();
        otroPagoForm.patchValue(otroPago);
        this.otrosPagos.push(otroPagoForm);
      });
    }
    
    // Recalcular totales
    this.calcularTotales();
  }
  
  // Enviar el formulario
  onSubmit(): void {
  if (this.cfdiForm.invalid || this.nominaForm.invalid) {
    console.error('❌ Formulario inválido');
    Sweetalert.fnc('error', 'Por favor completa todos los campos requeridos', null);
    this.cfdiForm.markAllAsTouched();
    this.nominaForm.markAllAsTouched();
    return;
  }

  this.loading = true;

  // Generar el JSON para el CFDI de Nómina
  const cfdiNominaData = this.generarJsonCfdiNomina();
  
  console.log('📄 JSON CFDI Nómina generado:', cfdiNominaData);
  console.log('📄 JSON Stringified:', JSON.stringify(cfdiNominaData, null, 2));

  // Mostrar éxito y cerrar
  Sweetalert.fnc('success', 'JSON generado correctamente. Revisa la consola.', null);
  this.loading = false;
  this.dialogRef.close(cfdiNominaData); // Devolver el JSON al componente padre
}

private generarJsonCfdiNomina(): any {
  const generalData = this.cfdiForm.value;
  const empleadoData = this.nominaForm.get('empleado')?.value;

  // Calcular totales
  let totalPercepciones = 0;
  let totalPercepcionesGravado = 0;
  let totalPercepcionesExento = 0;

  this.percepciones.controls.forEach(control => {
    const gravado = parseFloat(control.get('importeGravado')?.value || 0);
    const exento = parseFloat(control.get('importeExento')?.value || 0);
    totalPercepcionesGravado += gravado;
    totalPercepcionesExento += exento;
  });
  totalPercepciones = totalPercepcionesGravado + totalPercepcionesExento;

  let totalDeducciones = 0;
  this.deducciones.controls.forEach(control => {
    const gravado = parseFloat(control.get('importeGravado')?.value || 0);
    const exento = parseFloat(control.get('importeExento')?.value || 0);
    totalDeducciones += gravado + exento;
  });

  let totalOtrosPagos = 0;
  this.otrosPagos.controls.forEach(control => {
    const importe = parseFloat(control.get('importe')?.value || 0);
    totalOtrosPagos += importe;
  });

  const subtotal = totalPercepciones;
  const descuento = totalDeducciones;
  const total = subtotal - descuento + totalOtrosPagos;

  // Construir el JSON
  const cfdiData = {
    // ========== COMPROBANTE (Raíz) ==========
    comprobante: {
      version: '4.0',
      serie: generalData.serie,
      fecha: this.formatFechaISO(generalData.fecha),
      subTotal: subtotal.toFixed(2),
      descuento: descuento.toFixed(2),
      moneda: generalData.moneda,
      total: total.toFixed(2),
      tipoDeComprobante: 'N', // N = Nómina
      exportacion: '01',
      metodoPago: 'PUE',
      lugarExpedicion: generalData.sucursal ? this.selectedSucursal?.codigoPostal : '37160',
    },

    // ========== EMISOR ==========
    emisor: {
      rfc: 'DIVM801101RJ9',
      nombre: 'MARIO DIAZ VALENCIA',
      regimenFiscal: '612'
    },

    // ========== RECEPTOR (Empleado) ==========
    receptor: {
      rfc: empleadoData.rfc,
      nombre: empleadoData.nombre,
      domicilioFiscalReceptor: '37440',
      regimenFiscalReceptor: '605',
      usoCFDI: 'CN01'
    },

    // ========== CONCEPTOS ==========
    conceptos: [
      {
        claveProdServ: '84111505',
        cantidad: '1',
        claveUnidad: 'ACT',
        descripcion: 'Pago de nómina',
        valorUnitario: subtotal.toFixed(2),
        importe: subtotal.toFixed(2),
        descuento: descuento.toFixed(2),
        objetoImp: '01'
      }
    ],

    // ========== COMPLEMENTO NÓMINA 1.2 ==========
    nomina: {
      version: '1.2',
      tipoNomina: generalData.tipoNomina,
      fechaPago: this.formatFechaISO(generalData.fechaPago),
      fechaInicialPago: generalData.fechaInicialPago ? this.formatFechaISO(generalData.fechaInicialPago) : null,
      fechaFinalPago: generalData.fechaFinalPago ? this.formatFechaISO(generalData.fechaFinalPago) : null,
      numDiasPagados: generalData.diasPagados.toString(),
      totalPercepciones: totalPercepciones.toFixed(2),
      totalDeducciones: totalDeducciones.toFixed(2),
      totalOtrosPagos: totalOtrosPagos.toFixed(2),

      // Emisor Nómina
      emisorNomina: {
        curp: 'DIVM801101HJCZLR05',
        registroPatronal: generalData.registroPatronal
      },

      // Receptor Nómina (Empleado)
      receptorNomina: {
        curp: empleadoData.curp,
        numSeguridadSocial: empleadoData.numSeguridadSocial,
        fechaInicioRelLaboral: empleadoData.fechaInicioRelacionLaboral ? this.formatFechaISO(empleadoData.fechaInicioRelacionLaboral) : null,
        antiguedad: empleadoData.antiguedad,
        tipoContrato: empleadoData.tipoContrato,
        tipoJornada: empleadoData.tipoJornada,
        tipoRegimen: empleadoData.regimenContratacion,
        numEmpleado: empleadoData.numeroEmpleado,
        departamento: empleadoData.departamento,
        puesto: empleadoData.puesto,
        riesgoPuesto: empleadoData.riesgoPuesto,
        periodicidadPago: '04',
        salarioBaseCotApor: empleadoData.salarioBaseCotizacion ? empleadoData.salarioBaseCotizacion.toFixed(2) : '0.00',
        salarioDiarioIntegrado: empleadoData.salarioDiarioIntegrado ? empleadoData.salarioDiarioIntegrado.toFixed(2) : '0.00',
        claveEntFed: 'GUA',
        banco: empleadoData.banco,
        cuentaBancaria: empleadoData.clabe
      },

      // Percepciones
      percepciones: {
        totalSueldos: totalPercepciones.toFixed(2),
        totalGravado: totalPercepcionesGravado.toFixed(2),
        totalExento: totalPercepcionesExento.toFixed(2),
        percepciones: this.percepciones.controls.map(control => ({
          tipoPercepcion: control.get('tipo')?.value,
          clave: control.get('clave')?.value,
          concepto: control.get('concepto')?.value,
          importeGravado: parseFloat(control.get('importeGravado')?.value || 0).toFixed(2),
          importeExento: parseFloat(control.get('importeExento')?.value || 0).toFixed(2)
        }))
      },

      // Deducciones
      deducciones: this.deducciones.length > 0 ? {
        totalOtrasDeducciones: totalDeducciones.toFixed(2),
        deducciones: this.deducciones.controls.map(control => ({
          tipoDeduccion: control.get('tipo')?.value,
          clave: control.get('clave')?.value,
          concepto: control.get('concepto')?.value,
          importe: (parseFloat(control.get('importeGravado')?.value || 0) + parseFloat(control.get('importeExento')?.value || 0)).toFixed(2)
        }))
      } : null,

      // Otros Pagos
      otrosPagos: this.otrosPagos.length > 0 ? {
        otrosPagos: this.otrosPagos.controls.map(control => ({
          tipoOtroPago: control.get('tipo')?.value,
          clave: control.get('clave')?.value,
          concepto: control.get('concepto')?.value,
          importe: parseFloat(control.get('importe')?.value || 0).toFixed(2)
        }))
      } : null
    },

    // ========== CERTIFICADO ==========
    certificado: {
      password: generalData.csdPassword
    },

    // ========== OBSERVACIONES ==========
    observaciones: generalData.observaciones
  };

  return cfdiData;
}

// Método auxiliar para formatear fechas a ISO
private formatFechaISO(fecha: any): string {
  if (!fecha) return '';
  
  const date = new Date(fecha);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

// Cerrar el diálogo sin guardar
onCancel(): void {
  this.dialogRef.close();
}
}