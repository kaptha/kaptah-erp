import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { MAT_DATE_LOCALE, provideNativeDateAdapter } from '@angular/material/core';
import { MatPaginatorIntl, PageEvent } from '@angular/material/paginator';
import { Subject, Subscription } from 'rxjs';
import { forkJoin, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, finalize } from 'rxjs/operators';
import { CfdiApiService } from '../../services/cfdi-api.service';

type AtajoPeriodo = 'mes' | 'mesAnterior' | 'anio' | 'anioAnterior';

interface ResumenGeneralEgresos {
  totalCfdis: number;
  cfdisVigentes: number;
  cfdisCancelados: number;
  subtotal: number;
  ivaTotal: number;
  total: number;
  montoCancelados: number;
  promedioGasto: number;
  porcentajeVigentes: number;
}

interface ProveedorResumen {
  nombre: string;
  rfc: string;
  cantidad: number;
  totalMonto: number;
  porcentajeParticipacion?: number;
  ticketPromedio?: number;
}

interface AnalisisTemporalItem {
  periodo: string;
  cantidad: number;
  subtotal: number;
  iva: number;
  total: number;
}

interface ClasificacionEgreso {
  cantidad: number;
  total: number;
  formaPago?: string;
  usoCfdi?: string;
  porcentaje?: number;
}

interface TipoGastoResumen {
  deducibles: number;
  noDeducibles: number;
  cantidadDeducibles: number;
  cantidadNoDeducibles: number;
  porcentajeDeducibles: number;
}

interface InformacionFiscalEgresos {
  ivaAcreditable: number;
  isrRetenido: number;
  ivaRetenido: number;
  iepsRetenido: number;
  retencionesLocales: number;
  cfdisPago: number;
  totalRetenciones: number;
}

interface GastoRecurrente {
  nombre: string;
  rfc: string;
  cantidad: number;
  montoPromedio: number;
  totalMonto: number;
}

interface ProveedorNuevo {
  nombre: string;
  rfc: string;
  primeraFactura: string;
  cantidadFacturas: number;
  totalMonto: number;
}

interface ConceptoCfdi {
  descripcion: string;
  cantidad: number;
  valorUnitario: number;
  importe: number;
}

interface ImpuestoLocalCfdi {
  tipo: 'retencion' | 'traslado';
  impuesto: string;
  tasa: number;
  importe: number;
}

interface CfdiEgresoDetalle {
  folio_fiscal: string;
  serie?: string;
  folio?: string;
  fecha: string;
  estado_procesamiento?: string;
  tipo_comprobante?: string;
  metodo_pago?: string;
  forma_pago?: string;
  moneda?: string;
  tipo_cambio?: number;

  nombre_emisor?: string;
  rfc_emisor?: string;
  regimen_fiscal_emisor?: string;

  nombre_receptor?: string;
  rfc_receptor?: string;
  uso_cfdi?: string;

  sub_total?: number;
  descuento?: number;
  iva_trasladado?: number;
  total_impuestos_trasladados?: number;
  total_impuestos_retenidos?: number;
  iva_retenido?: number;
  isr_retenido?: number;
  ieps_retenido?: number;
  retenciones_locales?: number | string;
  traslados_locales?: number | string;
  impuestos_locales_detalle?: ImpuestoLocalCfdi[] | null;
  total?: number;

  conceptos_detalle?: ConceptoCfdi[];
  impuestos?: any[];
  retenciones?: any[];

  // Calculados en el frontend para la tabla
  contraparte_nombre?: string;
  contraparte_rfc?: string;
  alertas?: string[];
}

interface AdvancedSearchEgresosPayload {
  rfc?: string;
  nombre?: string;
  uuid?: string;
  folio?: string;
  fechaInicio?: string;
  fechaFin?: string;
  serie?: string;
  montoMin?: number;
  montoMax?: number;
}

interface AnalisisEgresosResponse {
  resumenGeneral?: Partial<ResumenGeneralEgresos>;
  topProveedoresPorMonto?: ProveedorResumen[];
  topProveedoresPorCantidad?: ProveedorResumen[];
  analisisTemporal?: AnalisisTemporalItem[];
  porFormaPago?: ClasificacionEgreso[];
  porUsoCfdi?: ClasificacionEgreso[];
  porTipoGasto?: Partial<TipoGastoResumen>;
  informacionFiscal?: Partial<InformacionFiscalEgresos>;
  gastosRecurrentes?: GastoRecurrente[];
  proveedoresNuevos?: ProveedorNuevo[];
}

// Textos del paginador en español (solo para este componente)
export function paginadorEgresosEnEspanol(): MatPaginatorIntl {
  const intl = new MatPaginatorIntl();
  intl.itemsPerPageLabel = 'Por página';
  intl.nextPageLabel = 'Siguiente';
  intl.previousPageLabel = 'Anterior';
  intl.firstPageLabel = 'Primera página';
  intl.lastPageLabel = 'Última página';
  intl.getRangeLabel = (page: number, pageSize: number, length: number) => {
    if (!length || !pageSize) {
      return `0 de ${length || 0}`;
    }
    const inicio = page * pageSize;
    const fin = Math.min(inicio + pageSize, length);
    return `${inicio + 1} – ${fin} de ${length}`;
  };
  return intl;
}

@Component({
  selector: 'app-egresos',
  templateUrl: './egresos.component.html',
  styleUrls: ['./egresos.component.css'],
  standalone: false,
  // Calendario de Material en español (es-MX) y paginador en español, solo para este componente
  providers: [
    provideNativeDateAdapter(),
    { provide: MAT_DATE_LOCALE, useValue: 'es-MX' },
    { provide: MatPaginatorIntl, useFactory: paginadorEgresosEnEspanol }
  ]
})
export class EgresosComponent implements OnInit, OnDestroy {
  // =========================================================
  // UI STATE
  // =========================================================
  isLoading = false;
  isSearching = false;
  sideSheetOpen = false;
  detailPanelOpen = false;
  // Conserva la pestaña activa cuando se recarga el análisis al cambiar el periodo
  tabIndex = 0;

  // =========================================================
  // FILTERS
  // =========================================================
  fechaInicioControl = new FormControl<Date | null>(null);
  fechaFinControl = new FormControl<Date | null>(null);

  // Calendario: sin fechas futuras; en celular se abre a pantalla completa (touchUi)
  readonly fechaMax = this.hoy();
  esMovil = false;
  private subs = new Subscription();

  atajos: { clave: AtajoPeriodo; etiqueta: string }[] = [
    { clave: 'mes', etiqueta: 'Este mes' },
    { clave: 'mesAnterior', etiqueta: 'Mes pasado' },
    { clave: 'anio', etiqueta: 'Este año' },
    { clave: 'anioAnterior', etiqueta: 'Año pasado' }
  ];

  searchQuery = '';
  searchFilters = {
    rfc: '',
    nombre: '',
    uuid: '',
    folio: '',
    fechaInicio: null as Date | null,
    fechaFin: null as Date | null,
    serie: '',
    montoMin: null as number | null,
    montoMax: null as number | null
  };

  // =========================================================
  // DATA
  // =========================================================
  analisisCompleto: AnalisisEgresosResponse | null = null;
  searchResults: CfdiEgresoDetalle[] = [];
  selectedCfdi: CfdiEgresoDetalle | null = null;

  readonly EMPTY_RESUMEN: ResumenGeneralEgresos = {
    totalCfdis: 0,
    cfdisVigentes: 0,
    cfdisCancelados: 0,
    subtotal: 0,
    ivaTotal: 0,
    total: 0,
    montoCancelados: 0,
    promedioGasto: 0,
    porcentajeVigentes: 0
  };

  readonly EMPTY_TIPO_GASTO: TipoGastoResumen = {
    deducibles: 0,
    noDeducibles: 0,
    cantidadDeducibles: 0,
    cantidadNoDeducibles: 0,
    porcentajeDeducibles: 0
  };

  readonly EMPTY_INFO_FISCAL: InformacionFiscalEgresos = {
    ivaAcreditable: 0,
    isrRetenido: 0,
    ivaRetenido: 0,
    iepsRetenido: 0,
    retencionesLocales: 0,
    cfdisPago: 0,
    totalRetenciones: 0
  };

  resumenGeneral: ResumenGeneralEgresos = { ...this.EMPTY_RESUMEN };
  porTipoGasto: TipoGastoResumen = { ...this.EMPTY_TIPO_GASTO };
  informacionFiscal: InformacionFiscalEgresos = { ...this.EMPTY_INFO_FISCAL };

  topProveedoresPorMonto: ProveedorResumen[] = [];
  topProveedoresPorCantidad: ProveedorResumen[] = [];

  analisisTemporal: AnalisisTemporalItem[] = [];
  chartDataTemporal: any[] = [];

  porFormaPago: ClasificacionEgreso[] = [];
  porUsoCfdi: ClasificacionEgreso[] = [];

  gastosRecurrentes: GastoRecurrente[] = [];
  proveedoresNuevos: ProveedorNuevo[] = [];

  // =========================================================
  // CFDIs DEL PERIODO (tab "CFDIs")
  // =========================================================
  cfdisPeriodo: CfdiEgresoDetalle[] = [];
  totalCfdisPeriodo = 0;
  pageIndexCfdis = 0;
  pageSizeCfdis = 25;
  readonly pageSizeOptionsCfdis = [25, 50, 100];
  isLoadingCfdis = false;
  filtroCfdis = '';
  filtroTipoCfdis = '';
  filtroMetodoCfdis = '';
  soloAlertas = false;

  private periodoActual = { inicio: '', fin: '' };
  private filtroCfdis$ = new Subject<string>();
  private cfdisSub?: Subscription;

  private readonly columnasCfdisEscritorio = [
    'fecha', 'tipo', 'folio', 'proveedor', 'metodo', 'subtotal', 'iva', 'total', 'acciones'
  ];
  private readonly columnasCfdisMovil = ['fecha', 'proveedor', 'total'];

  get columnasCfdis(): string[] {
    return this.esMovil ? this.columnasCfdisMovil : this.columnasCfdisEscritorio;
  }

  get periodoTexto(): string {
    const { inicio, fin } = this.periodoActual;
    if (!inicio || !fin) {
      return '';
    }
    return `del ${this.formatDate(inicio)} al ${this.formatDate(fin)}`;
  }

  get hayFiltrosCfdis(): boolean {
    return !!(this.filtroCfdis || this.filtroTipoCfdis || this.filtroMetodoCfdis || this.soloAlertas);
  }

  // =========================================================
  // VISUAL CONFIG
  // =========================================================
  colorScheme: any = {
    domain: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8']
  };

  // =========================================================
  // FORMATTERS
  // =========================================================
  private readonly currencyFormatter = new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2
  });

  private readonly numberFormatter = new Intl.NumberFormat('es-MX');
  private readonly formattersMoneda = new Map<string, Intl.NumberFormat>();

  constructor(private cfdiApiService: CfdiApiService, private breakpoints: BreakpointObserver) {}

  ngOnInit(): void {
    this.initializeComponent();
  }

  // =========================================================
  // INITIALIZATION
  // =========================================================
  private initializeComponent(): void {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    this.fechaInicioControl.setValue(startOfYear);
    this.fechaFinControl.setValue(this.hoy());

    this.subs.add(
      this.breakpoints
        .observe([Breakpoints.Handset, Breakpoints.TabletPortrait])
        .subscribe((r) => (this.esMovil = r.matches))
    );

    // Filtro de texto del tab CFDIs: espera a que el usuario deje de escribir
    this.subs.add(
      this.filtroCfdis$
        .pipe(debounceTime(400), distinctUntilChanged())
        .subscribe(() => {
          this.pageIndexCfdis = 0;
          this.loadCfdisPeriodo();
        })
    );

    this.loadAnalisisCompleto();
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
    this.cfdisSub?.unsubscribe();
  }

  // YYYY-MM-DD en hora local (toISOString convertía a UTC y después de las 18:00 daba el día siguiente)
  private toInputDate(date: Date): string {
    const m = `${date.getMonth() + 1}`.padStart(2, '0');
    const d = `${date.getDate()}`.padStart(2, '0');
    return `${date.getFullYear()}-${m}-${d}`;
  }

  private hoy(): Date {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  aplicarAtajo(clave: AtajoPeriodo): void {
    const hoy = this.hoy();
    let inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    let fin = hoy;
    switch (clave) {
      case 'mesAnterior':
        inicio = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
        fin = new Date(hoy.getFullYear(), hoy.getMonth(), 0);
        break;
      case 'anio':
        inicio = new Date(hoy.getFullYear(), 0, 1);
        break;
      case 'anioAnterior':
        inicio = new Date(hoy.getFullYear() - 1, 0, 1);
        fin = new Date(hoy.getFullYear() - 1, 11, 31);
        break;
    }
    this.fechaInicioControl.setValue(inicio);
    this.fechaFinControl.setValue(fin);
    this.loadAnalisisCompleto();
  }

  // =========================================================
  // MAIN LOAD
  // =========================================================
  loadAnalisisCompleto(): void {
    const inicio = this.fechaInicioControl.value;
    const fin = this.fechaFinControl.value;
    const fechaInicio = inicio ? this.toInputDate(inicio) : '';
    const fechaFin = fin ? this.toInputDate(fin) : '';

    if (!fechaInicio || !fechaFin) {
      return;
    }

    // La lista de CFDIs sigue al mismo periodo que el análisis
    this.periodoActual = { inicio: fechaInicio, fin: fechaFin };
    this.pageIndexCfdis = 0;
    this.loadCfdisPeriodo();

    this.isLoading = true;

    this.cfdiApiService
      .getAnalisisCompletoEgresos(fechaInicio, fechaFin)
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (response: any) => {
          if (response?.success && response?.analisis) {
            this.analisisCompleto = response.analisis as AnalisisEgresosResponse;
            this.processAnalisisData();
            return;
          }

          this.resetAnalisisState();
        },
        error: (error) => {
          console.error('❌ Error cargando análisis de egresos:', error);
          this.resetAnalisisState();
        }
      });
  }

  onFechaChange(): void {
    this.loadAnalisisCompleto();
  }

  private processAnalisisData(): void {
    if (!this.analisisCompleto) {
      this.resetAnalisisState();
      return;
    }

    this.resumenGeneral = {
      ...this.EMPTY_RESUMEN,
      ...(this.analisisCompleto.resumenGeneral || {})
    };

    this.porTipoGasto = {
      ...this.EMPTY_TIPO_GASTO,
      ...(this.analisisCompleto.porTipoGasto || {})
    };

    this.informacionFiscal = {
      ...this.EMPTY_INFO_FISCAL,
      ...(this.analisisCompleto.informacionFiscal || {})
    };

    this.topProveedoresPorMonto = this.enrichProveedores(
      this.analisisCompleto.topProveedoresPorMonto || []
    );

    this.topProveedoresPorCantidad = this.enrichProveedores(
      this.analisisCompleto.topProveedoresPorCantidad || []
    );

    this.analisisTemporal = this.analisisCompleto.analisisTemporal || [];
    this.prepareChartData();

    this.porFormaPago = this.enrichClasificaciones(
      this.analisisCompleto.porFormaPago || []
    );

    this.porUsoCfdi = this.enrichClasificaciones(
      this.analisisCompleto.porUsoCfdi || []
    );

    this.gastosRecurrentes = this.analisisCompleto.gastosRecurrentes || [];
    this.proveedoresNuevos = this.analisisCompleto.proveedoresNuevos || [];
  }

  private resetAnalisisState(): void {
    this.analisisCompleto = null;
    this.resumenGeneral = { ...this.EMPTY_RESUMEN };
    this.porTipoGasto = { ...this.EMPTY_TIPO_GASTO };
    this.informacionFiscal = { ...this.EMPTY_INFO_FISCAL };
    this.topProveedoresPorMonto = [];
    this.topProveedoresPorCantidad = [];
    this.analisisTemporal = [];
    this.chartDataTemporal = [];
    this.porFormaPago = [];
    this.porUsoCfdi = [];
    this.gastosRecurrentes = [];
    this.proveedoresNuevos = [];
  }

  private prepareChartData(): void {
    this.chartDataTemporal = [
      {
        name: 'Egresos',
        series: this.analisisTemporal.map((item) => ({
          name: this.formatPeriodo(item.periodo),
          value: item.total || 0
        }))
      }
    ];
  }

  // =========================================================
  // CFDIs DEL PERIODO
  // =========================================================
  loadCfdisPeriodo(): void {
    const { inicio, fin } = this.periodoActual;
    if (!inicio || !fin) {
      return;
    }

    // Si cambian de página o de periodo rápido, se cancela la petición anterior
    this.cfdisSub?.unsubscribe();
    this.isLoadingCfdis = true;

    this.cfdisSub = this.cfdiApiService
      .listarCfdisEgresosPeriodo({
        fechaInicio: inicio,
        fechaFin: fin,
        query: this.filtroCfdis.trim(),
        tipoComprobante: this.filtroTipoCfdis,
        metodoPago: this.filtroMetodoCfdis,
        soloAlertas: this.soloAlertas,
        offset: this.pageIndexCfdis * this.pageSizeCfdis,
        limit: this.pageSizeCfdis
      })
      .pipe(finalize(() => (this.isLoadingCfdis = false)))
      .subscribe({
        next: (response: any) => {
          const lista: CfdiEgresoDetalle[] = (response?.cfdis || []).map((c: CfdiEgresoDetalle) =>
            this.prepararFila(c)
          );
          this.cfdisPeriodo = lista;
          this.totalCfdisPeriodo = Number(response?.total ?? lista.length) || 0;
        },
        error: (error) => {
          console.error('❌ Error cargando CFDIs de egreso del periodo:', error);
          this.cfdisPeriodo = [];
          this.totalCfdisPeriodo = 0;
        }
      });
  }

  // En nómina la contraparte es el empleado (receptor); en lo demás, el proveedor (emisor)
  private prepararFila(c: CfdiEgresoDetalle): CfdiEgresoDetalle {
    const esNomina = c.tipo_comprobante === 'N';
    return {
      ...c,
      contraparte_nombre: (esNomina ? c.nombre_receptor : c.nombre_emisor) || 'Sin nombre',
      contraparte_rfc: (esNomina ? c.rfc_receptor : c.rfc_emisor) || 'Sin RFC',
      alertas: this.calcularAlertas(c)
    };
  }

  // Avisos de deducibilidad (orientativos; la decisión final es del contador)
  private calcularAlertas(c: CfdiEgresoDetalle): string[] {
    const alertas: string[] = [];
    if (c.tipo_comprobante !== 'I') {
      return alertas;
    }
    if (c.forma_pago === '01' && Math.abs(Number(c.total || 0)) > 2000) {
      alertas.push('Pago en efectivo mayor a $2,000: posiblemente no deducible');
    }
    if ((c.uso_cfdi || '').toUpperCase() === 'S01') {
      alertas.push('Uso S01: sin efectos fiscales');
    }
    return alertas;
  }

  onFiltroCfdisChange(valor: string): void {
    this.filtroCfdis$.next((valor || '').trim());
  }

  limpiarFiltroCfdis(): void {
    this.filtroCfdis = '';
    this.filtroCfdis$.next('');
  }

  onFiltroSelectChange(): void {
    this.pageIndexCfdis = 0;
    this.loadCfdisPeriodo();
  }

  toggleSoloAlertas(): void {
    this.soloAlertas = !this.soloAlertas;
    this.onFiltroSelectChange();
  }

  onPageCfdis(event: PageEvent): void {
    this.pageIndexCfdis = event.pageIndex;
    this.pageSizeCfdis = event.pageSize;
    this.loadCfdisPeriodo();
  }

  copiarUuid(uuid: string | undefined, event: Event): void {
    event.stopPropagation();
    if (!uuid || !navigator.clipboard) {
      return;
    }
    navigator.clipboard.writeText(uuid).catch((err) => console.error('No se pudo copiar el UUID:', err));
  }

  descargarXmlFila(cfdi: CfdiEgresoDetalle, event: Event): void {
    event.stopPropagation();
    this.descargarXml(cfdi);
  }

  descargarPdfFila(cfdi: CfdiEgresoDetalle, event: Event): void {
    event.stopPropagation();
    this.descargarPdf(cfdi);
  }

  esMonedaExtranjera(cfdi: CfdiEgresoDetalle | null): boolean {
    const moneda = (cfdi?.moneda || 'MXN').toUpperCase();
    return moneda !== 'MXN' && moneda !== 'XXX';
  }

  tieneRetencionFila(cfdi: CfdiEgresoDetalle): boolean {
    return Number(cfdi?.total_impuestos_retenidos || 0) > 0;
  }

  tieneRetencionLocalFila(cfdi: CfdiEgresoDetalle): boolean {
    return Number(cfdi?.retenciones_locales || 0) > 0;
  }

  tieneTrasladoLocalFila(cfdi: CfdiEgresoDetalle): boolean {
    return Number(cfdi?.traslados_locales || 0) > 0;
  }

  impuestosLocales(cfdi: CfdiEgresoDetalle | null, tipo: 'retencion' | 'traslado'): ImpuestoLocalCfdi[] {
    return (cfdi?.impuestos_locales_detalle || []).filter((i) => i.tipo === tipo);
  }

  formatTasa(tasa: number | string | null | undefined): string {
    const pct = (Number(tasa) || 0) * 100;
    return `${Number(pct.toFixed(4))}%`;
  }

  getTipoComprobanteLabel(tipo: string | undefined): string {
    const tipos: Record<string, string> = {
      I: 'Factura',
      E: 'Nota de crédito',
      P: 'Pago',
      N: 'Nómina',
      T: 'Traslado'
    };
    return tipos[(tipo || '').toUpperCase()] || tipo || '—';
  }

  // =========================================================
  // VIEW MODEL HELPERS
  // =========================================================
  private enrichClasificaciones<T extends { total: number }>(
    items: T[]
  ): (T & { porcentaje: number })[] {
    const total = this.resumenGeneral.total || 0;

    return items.map((item) => ({
      ...item,
      porcentaje: this.getSafePercentage(item.total || 0, total)
    }));
  }

  private enrichProveedores<T extends { totalMonto: number; cantidad: number }>(
    items: T[]
  ): (T & { porcentajeParticipacion: number; ticketPromedio: number })[] {
    const total = this.resumenGeneral.total || 0;

    return items.map((item) => ({
      ...item,
      porcentajeParticipacion: this.getSafePercentage(item.totalMonto || 0, total),
      ticketPromedio: item.cantidad ? (item.totalMonto || 0) / item.cantidad : 0
    }));
  }

  getSafePercentage(value: number, total: number): number {
    if (!total || total <= 0) {
      return 0;
    }

    return Number(((value / total) * 100).toFixed(2));
  }

  // =========================================================
  // EXPORT
  // =========================================================
  exportToExcel(): void {
    console.log('📊 Exportación de egresos a Excel en desarrollo');
    alert('Funcionalidad de exportación en desarrollo');
  }

  // =========================================================
  // SEARCH PANEL
  // =========================================================
  openSearchPanel(): void {
    this.sideSheetOpen = true;
    this.searchQuery = '';
    this.searchResults = [];

    // Precarga el periodo actual en el rango de fechas de la búsqueda avanzada
    if (!this.searchFilters.fechaInicio && !this.searchFilters.fechaFin) {
      this.searchFilters.fechaInicio = this.fechaInicioControl.value;
      this.searchFilters.fechaFin = this.fechaFinControl.value;
    }
  }

  closeSearchPanel(): void {
    this.sideSheetOpen = false;
    this.searchQuery = '';
    this.searchResults = [];
    this.resetSearchFilters();
  }

  resetSearchFilters(): void {
    this.searchFilters = {
      rfc: '',
      nombre: '',
      uuid: '',
      folio: '',
      fechaInicio: null,
      fechaFin: null,
      serie: '',
      montoMin: null,
      montoMax: null
    };
  }

  // =========================================================
  // QUICK SEARCH
  // =========================================================
  onSearchChange(): void {
    const query = this.searchQuery.trim();

    if (query.length < 3) {
      this.searchResults = [];
      return;
    }

    this.isSearching = true;

    this.cfdiApiService
      .buscarCfdisEgresos(query)
      .pipe(finalize(() => (this.isSearching = false)))
      .subscribe({
        next: (response: any) => {
          this.searchResults = response?.cfdis || [];
        },
        error: (error) => {
          console.error('❌ Error en búsqueda rápida de egresos:', error);
          this.searchResults = [];
        }
      });
  }

  // =========================================================
  // ADVANCED SEARCH
  // =========================================================
  buscarAvanzado(): void {
    const filtros = this.buildAdvancedFilters();

    if (!Object.keys(filtros).length) {
      alert('Por favor, ingrese al menos un criterio de búsqueda');
      return;
    }

    this.isSearching = true;

    this.cfdiApiService
      .busquedaAvanzadaEgresos(filtros)
      .pipe(finalize(() => (this.isSearching = false)))
      .subscribe({
        next: (response: any) => {
          this.searchResults = response?.cfdis || [];
        },
        error: (error) => {
          console.error('❌ Error en búsqueda avanzada de egresos:', error);
          this.searchResults = [];
        }
      });
  }

  private buildAdvancedFilters(): AdvancedSearchEgresosPayload {
    const filtros: AdvancedSearchEgresosPayload = {};

    if (this.searchFilters.rfc?.trim()) {
      filtros.rfc = this.searchFilters.rfc.trim();
    }

    if (this.searchFilters.nombre?.trim()) {
      filtros.nombre = this.searchFilters.nombre.trim();
    }

    if (this.searchFilters.uuid?.trim()) {
      filtros.uuid = this.searchFilters.uuid.trim();
    }

    if (this.searchFilters.folio?.trim()) {
      filtros.folio = this.searchFilters.folio.trim();
    }

    if (this.searchFilters.fechaInicio) {
      filtros.fechaInicio = this.toInputDate(this.searchFilters.fechaInicio);
    }

    if (this.searchFilters.fechaFin) {
      filtros.fechaFin = this.toInputDate(this.searchFilters.fechaFin);
    }

    if (this.searchFilters.serie?.trim()) {
      filtros.serie = this.searchFilters.serie.trim();
    }

    if (this.searchFilters.montoMin !== null && this.searchFilters.montoMin !== undefined) {
      filtros.montoMin = this.searchFilters.montoMin;
    }

    if (this.searchFilters.montoMax !== null && this.searchFilters.montoMax !== undefined) {
      filtros.montoMax = this.searchFilters.montoMax;
    }

    return filtros;
  }

  // =========================================================
  // CFDI DETAIL
  // =========================================================
  selectCfdi(cfdi: CfdiEgresoDetalle): void {
    this.selectedCfdi = cfdi.alertas ? { ...cfdi } : this.prepararFila(cfdi);
    this.detailPanelOpen = true;

    if (cfdi.folio_fiscal) {
      this.loadCfdiDetails(cfdi.folio_fiscal);
    }
  }

  closeDetailPanel(): void {
    this.detailPanelOpen = false;
    this.selectedCfdi = null;
  }

  loadCfdiDetails(uuid: string): void {
    if (!uuid) {
      return;
    }

    forkJoin({
      impuestos: this.cfdiApiService.getImpuestosCfdi(uuid).pipe(
        catchError((error) => {
          console.error('❌ Error cargando impuestos:', error);
          return of({ success: false, impuestos: [] });
        })
      ),
      retenciones: this.cfdiApiService.getRetencionesCfdi(uuid).pipe(
        catchError((error) => {
          console.error('❌ Error cargando retenciones:', error);
          return of({ success: false, retenciones: [] });
        })
      ),
      partidas: this.cfdiApiService.getPartidasCfdi(uuid).pipe(
        catchError((error) => {
          console.error('❌ Error cargando partidas:', error);
          return of({ success: false, partidas: [] });
        })
      )
    }).subscribe({
      next: ({ impuestos, retenciones, partidas }) => {
        if (!this.selectedCfdi) {
          return;
        }

        this.selectedCfdi = {
          ...this.selectedCfdi,
          impuestos: impuestos?.success ? impuestos.impuestos || [] : [],
          retenciones: retenciones?.success ? retenciones.retenciones || [] : [],
          conceptos_detalle: partidas?.success ? partidas.partidas || [] : []
        };
      },
      error: (error) => {
        console.error('❌ Error cargando detalle del CFDI:', error);
      }
    });
  }

  // =========================================================
  // DOWNLOADS
  // =========================================================
  descargarXml(cfdi: CfdiEgresoDetalle): void {
    if (!cfdi?.folio_fiscal) {
      alert('Error: UUID no encontrado en el CFDI');
      return;
    }

    this.cfdiApiService.descargarXml(cfdi.folio_fiscal).subscribe({
      next: (response: BlobPart) => {
        const blob = new Blob([response], { type: 'application/xml' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${cfdi.folio_fiscal}.xml`;
        link.click();
        window.URL.revokeObjectURL(url);
      },
      error: (error) => {
        console.error('❌ Error al descargar XML:', error);
        alert(`Error al descargar el XML: ${error?.message || 'Error desconocido'}`);
      }
    });
  }

  descargarPdf(cfdi: CfdiEgresoDetalle): void {
    if (!cfdi?.folio_fiscal) {
      alert('Error: El CFDI no tiene UUID (folio_fiscal)');
      return;
    }

    this.cfdiApiService.descargarPdf(cfdi.folio_fiscal).subscribe({
      next: (response: BlobPart) => {
        const blob = new Blob([response], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${cfdi.folio_fiscal}.pdf`;
        link.click();
        window.URL.revokeObjectURL(url);
      },
      error: (error) => {
        console.error('❌ Error descargando PDF:', error);
        alert(`Error al descargar el PDF: ${error?.message || 'Error desconocido'}`);
      }
    });
  }

  // =========================================================
  // HELPERS
  // =========================================================
  tieneRetenciones(cfdi: CfdiEgresoDetalle | null): boolean {
    if (!cfdi) {
      return false;
    }

    return (
      Number(cfdi.iva_retenido || 0) > 0 ||
      Number(cfdi.isr_retenido || 0) > 0 ||
      Number(cfdi.ieps_retenido || 0) > 0 ||
      Number(cfdi.retenciones_locales || 0) > 0
    );
  }

  getEstadoBadgeColor(estado: string | undefined): string {
    if (!estado) {
      return 'accent';
    }

    switch (estado.toUpperCase()) {
      case 'PROCESADO':
      case 'VIGENTE':
        return 'primary';
      case 'CANCELADO':
        return 'warn';
      case 'PENDIENTE':
        return 'accent';
      default:
        return 'accent';
    }
  }

  // =========================================================
  // FORMATTERS
  // =========================================================
  formatPeriodo(periodo: string): string {
    if (!periodo) {
      return '-';
    }

    const [year, month] = periodo.split('-');
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const monthIndex = Number(month) - 1;

    return `${meses[monthIndex] || month} ${year}`;
  }

  // La fecha del CFDI se guarda sin zona horaria: se toma la parte YYYY-MM-DD tal cual,
  // porque convertirla a hora de México la recorría un día en CFDI emitidos de madrugada.
  formatDate(date: string | Date | null | undefined): string {
    if (!date) {
      return '-';
    }

    if (typeof date === 'string') {
      const m = date.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (m) {
        return `${m[3]}/${m[2]}/${m[1]}`;
      }
    }

    const d = new Date(date);
    if (isNaN(d.getTime())) {
      return '-';
    }

    return d.toLocaleDateString('es-MX', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  }

  formatHora(date: string | Date | null | undefined): string {
    if (typeof date !== 'string') {
      return '';
    }
    const m = date.match(/[T ](\d{2}):(\d{2})/);
    return m ? `${m[1]}:${m[2]}` : '';
  }

  // Los decimal de Postgres llegan como string ("1234.50"); se convierten antes de formatear
  formatCurrency(amount: number | string | null | undefined): string {
    return this.currencyFormatter.format(Number(amount ?? 0) || 0);
  }

  formatMoneda(amount: number | string | null | undefined, moneda?: string): string {
    const codigo = (moneda || 'MXN').toUpperCase();
    if (codigo === 'MXN' || codigo === 'XXX') {
      return this.formatCurrency(amount);
    }

    let formatter = this.formattersMoneda.get(codigo);
    if (!formatter) {
      try {
        formatter = new Intl.NumberFormat('es-MX', {
          style: 'currency',
          currency: codigo,
          minimumFractionDigits: 2
        });
      } catch (e) {
        return `${this.formatNumber(Number(amount ?? 0) || 0)} ${codigo}`;
      }
      this.formattersMoneda.set(codigo, formatter);
    }

    return formatter.format(Number(amount ?? 0) || 0);
  }

  formatNumber(num: number | null | undefined): string {
    return this.numberFormatter.format(num ?? 0);
  }

  formatPercentage(num: number | null | undefined): string {
    return `${(num ?? 0).toFixed(2)}%`;
  }

  formatRfc(rfc: string): string {
    if (!rfc || rfc.length < 8) {
      return rfc;
    }

    const inicio = rfc.substring(0, 4);
    const fin = rfc.substring(rfc.length - 3);
    return `${inicio}***${fin}`;
  }

  // =========================================================
  // LABELS
  // =========================================================
  getFormaPagoLabel(codigo: string | undefined): string {
    if (!codigo) {
      return 'No especificada';
    }

    const formasPago: Record<string, string> = {
      '01': 'Efectivo',
      '02': 'Cheque nominativo',
      '03': 'Transferencia electrónica',
      '04': 'Tarjeta de crédito',
      '05': 'Monedero electrónico',
      '06': 'Dinero electrónico',
      '08': 'Vales de despensa',
      '12': 'Dación en pago',
      '13': 'Pago por subrogación',
      '14': 'Pago por consignación',
      '15': 'Condonación',
      '17': 'Compensación',
      '23': 'Novación',
      '24': 'Confusión',
      '25': 'Remisión de deuda',
      '26': 'Prescripción o caducidad',
      '27': 'A satisfacción del acreedor',
      '28': 'Tarjeta de débito',
      '29': 'Tarjeta de servicios',
      '30': 'Aplicación de anticipos',
      '31': 'Intermediario pagos',
      '99': 'Por definir'
    };

    return formasPago[codigo] || codigo;
  }

  getMetodoPagoLabel(codigo: string | undefined): string {
    if (!codigo) {
      return 'No especificado';
    }

    const metodos: Record<string, string> = {
      PUE: 'Pago en una sola exhibición',
      PPD: 'Pago en parcialidades o diferido'
    };

    return metodos[codigo] || codigo;
  }

  getUsoCfdiLabel(codigo: string | undefined): string {
    if (!codigo) {
      return 'No especificado';
    }

    const usos: Record<string, string> = {
      G01: 'Adquisición de mercancías',
      G02: 'Devoluciones, descuentos o bonificaciones',
      G03: 'Gastos en general',
      I01: 'Construcciones',
      I02: 'Mobiliario y equipo de oficina',
      I03: 'Equipo de transporte',
      I04: 'Equipo de cómputo',
      I05: 'Dados, troqueles, moldes',
      I06: 'Comunicaciones telefónicas',
      I07: 'Comunicaciones satelitales',
      I08: 'Otra maquinaria y equipo',
      D01: 'Honorarios médicos',
      D02: 'Gastos médicos',
      D03: 'Gastos funerales',
      D04: 'Donativos',
      D05: 'Intereses reales',
      D06: 'Aportaciones voluntarias',
      D07: 'Primas por seguros',
      D08: 'Gastos de transportación escolar',
      D09: 'Depósitos en cuentas',
      D10: 'Pagos por servicios educativos',
      S01: 'Sin efectos fiscales',
      CP01: 'Pagos',
      CN01: 'Nómina',
      P01: 'Por definir'
    };

    return usos[codigo] || codigo;
  }
}