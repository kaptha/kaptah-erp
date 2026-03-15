import { Component, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { CfdiApiService } from '../../services/cfdi-api.service';

interface ResumenGeneral {
  totalCfdis: number;
  cfdisVigentes: number;
  cfdisCancelados: number;
  subtotal: number;
  ivaTotal: number;
  total: number;
  montoCancelados: number;
  promedioIngreso: number;
  porcentajeVigentes: number;
}

interface ClienteResumen {
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

interface ClasificacionItem {
  cantidad: number;
  total: number;
  formaPago?: string;
  metodoPago?: string;
  usoCfdi?: string;
  porcentaje?: number;
}

interface RetencionesResumen {
  ivaRetenido: number;
  isrRetenido: number;
  iepsRetenido: number;
  totalRetenido: number;
}

interface ClienteInactivo {
  nombre: string;
  rfc: string;
  diasInactivo: number;
  totalFacturas: number;
  totalMonto: number;
}

interface PagoCfdi {
  fecha_pago: string;
  forma_pago: string;
  monto: number;
  uuid?: string;
}

interface PartidaCfdi {
  descripcion: string;
  cantidad: number;
  valorUnitario: number;
  importe: number;
}

interface CfdiDetalle {
  folio_fiscal: string;
  serie?: string;
  folio?: string;
  fecha: string;
  estado_procesamiento?: string;
  metodo_pago?: string;
  forma_pago?: string;
  moneda?: string;
  tipo_cambio?: number;
  condiciones_pago?: string;

  nombre_receptor?: string;
  rfc_receptor?: string;
  uso_cfdi?: string;

  nombre_emisor?: string;
  rfc_emisor?: string;
  regimen_fiscal_emisor?: string;
  lugar_expedicion?: string;

  sub_total?: number;
  descuento?: number;
  iva_trasladado?: number;
  total_impuestos_trasladados?: number;
  total_impuestos_retenidos?: number;
  iva_retenido?: number;
  isr_retenido?: number;
  ieps_retenido?: number;
  total?: number;

  conceptos_detalle?: PartidaCfdi[];
  pagos?: PagoCfdi[];

  impuestos?: any[];
  retenciones?: any[];
}

interface AnalisisIngresosResponse {
  resumenGeneral?: Partial<ResumenGeneral>;
  topClientesPorMonto?: ClienteResumen[];
  topClientesPorCantidad?: ClienteResumen[];
  analisisTemporal?: AnalisisTemporalItem[];
  porFormaPago?: ClasificacionItem[];
  porMetodoPago?: ClasificacionItem[];
  porUsoCfdi?: ClasificacionItem[];
  retenciones?: Partial<RetencionesResumen>;
  clientesInactivos?: ClienteInactivo[];
}

@Component({
  selector: 'app-ingresos',
  templateUrl: './ingresos.component.html',
  styleUrls: ['./ingresos.component.css'],
  standalone: false
})
export class IngresosComponent implements OnInit {
  // =========================================================
  // FORM CONTROLS
  // =========================================================
  fechaInicioControl = new FormControl('');
  fechaFinControl = new FormControl('');

  // =========================================================
  // UI STATE
  // =========================================================
  isLoading = false;
  isSearching = false;
  sideSheetOpen = false;
  detailPanelOpen = false;

  // =========================================================
  // DATA STATE
  // =========================================================
  analisisCompleto: AnalisisIngresosResponse | null = null;

  readonly EMPTY_RESUMEN: ResumenGeneral = {
    totalCfdis: 0,
    cfdisVigentes: 0,
    cfdisCancelados: 0,
    subtotal: 0,
    ivaTotal: 0,
    total: 0,
    montoCancelados: 0,
    promedioIngreso: 0,
    porcentajeVigentes: 0
  };

  readonly EMPTY_RETENCIONES: RetencionesResumen = {
    ivaRetenido: 0,
    isrRetenido: 0,
    iepsRetenido: 0,
    totalRetenido: 0
  };

  resumenGeneral: ResumenGeneral = { ...this.EMPTY_RESUMEN };
  retenciones: RetencionesResumen = { ...this.EMPTY_RETENCIONES };

  topClientesPorMonto: ClienteResumen[] = [];
  topClientesPorCantidad: ClienteResumen[] = [];
  analisisTemporal: AnalisisTemporalItem[] = [];
  porFormaPago: ClasificacionItem[] = [];
  porMetodoPago: ClasificacionItem[] = [];
  porUsoCfdi: ClasificacionItem[] = [];
  clientesInactivos: ClienteInactivo[] = [];

  chartDataTemporal: any[] = [];

  // =========================================================
  // SEARCH / CFDI DETAIL
  // =========================================================
  searchQuery = '';
  searchResults: CfdiDetalle[] = [];
  selectedCfdi: CfdiDetalle | null = null;

  searchFilters = {
    rfc: '',
    nombre: '',
    uuid: '',
    folio: '',
    fechaInicio: '',
    fechaFin: '',
    serie: '',
    montoMin: null as number | null,
    montoMax: null as number | null,
    metodoPago: '',
    formaPago: ''
  };

  // =========================================================
  // VISUAL CONFIG
  // =========================================================
  colorScheme: any = {
    domain: ['#667eea', '#11998e', '#4facfe', '#f5576c']
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

  constructor(private cfdiApiService: CfdiApiService) {}

  ngOnInit(): void {
    this.initializeComponent();
  }

  // =========================================================
  // INITIALIZATION
  // =========================================================
  private initializeComponent(): void {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    this.fechaInicioControl.setValue(this.toInputDate(startOfYear));
    this.fechaFinControl.setValue(this.toInputDate(now));

    this.loadAnalisisCompleto();
  }

  private toInputDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  // =========================================================
  // MAIN LOAD
  // =========================================================
  loadAnalisisCompleto(): void {
    const fechaInicio = this.fechaInicioControl.value || '';
    const fechaFin = this.fechaFinControl.value || '';

    if (!fechaInicio || !fechaFin) {
      return;
    }

    this.isLoading = true;

    this.cfdiApiService
      .getAnalisisCompletoIngresos(fechaInicio, fechaFin)
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (response: any) => {
          if (response?.success && response?.analisis) {
            this.analisisCompleto = response.analisis as AnalisisIngresosResponse;
            this.processAnalisisData();
            return;
          }

          this.resetAnalisisState();
        },
        error: (error) => {
          console.error('❌ Error cargando análisis de ingresos:', error);
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

    this.retenciones = {
      ...this.EMPTY_RETENCIONES,
      ...(this.analisisCompleto.retenciones || {})
    };

    this.topClientesPorMonto = this.enrichClientes(
      this.analisisCompleto.topClientesPorMonto || []
    );

    this.topClientesPorCantidad = this.enrichClientes(
      this.analisisCompleto.topClientesPorCantidad || []
    );

    this.analisisTemporal = this.analisisCompleto.analisisTemporal || [];

    this.porFormaPago = this.enrichClasificaciones(
      this.analisisCompleto.porFormaPago || []
    );

    this.porMetodoPago = this.enrichClasificaciones(
      this.analisisCompleto.porMetodoPago || []
    );

    this.porUsoCfdi = this.enrichClasificaciones(
      this.analisisCompleto.porUsoCfdi || []
    );

    this.clientesInactivos = this.analisisCompleto.clientesInactivos || [];

    this.prepareChartData();
  }

  private resetAnalisisState(): void {
    this.analisisCompleto = null;
    this.resumenGeneral = { ...this.EMPTY_RESUMEN };
    this.retenciones = { ...this.EMPTY_RETENCIONES };
    this.topClientesPorMonto = [];
    this.topClientesPorCantidad = [];
    this.analisisTemporal = [];
    this.porFormaPago = [];
    this.porMetodoPago = [];
    this.porUsoCfdi = [];
    this.clientesInactivos = [];
    this.chartDataTemporal = [];
  }

  // =========================================================
  // ENRICH / VIEW MODEL
  // =========================================================
  private enrichClientes(clientes: ClienteResumen[]): ClienteResumen[] {
    const total = this.resumenGeneral.total || 0;

    return clientes.map((cliente) => ({
      ...cliente,
      porcentajeParticipacion: this.getSafePercentage(cliente.totalMonto || 0, total),
      ticketPromedio: cliente.cantidad ? (cliente.totalMonto || 0) / cliente.cantidad : 0
    }));
  }

  private enrichClasificaciones(items: ClasificacionItem[]): ClasificacionItem[] {
    const total = this.resumenGeneral.total || 0;

    return items.map((item) => ({
      ...item,
      porcentaje: this.getSafePercentage(item.total || 0, total)
    }));
  }

  private prepareChartData(): void {
    this.chartDataTemporal = [
      {
        name: 'Total facturado',
        series: this.analisisTemporal.map((item) => ({
          name: this.formatPeriodo(item.periodo),
          value: item.total || 0
        }))
      }
    ];
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
    console.log('📊 Exportación de ingresos a Excel en desarrollo');
    alert('Funcionalidad de exportación en desarrollo');
  }

  // =========================================================
  // SEARCH PANEL
  // =========================================================
  openSearchPanel(): void {
    this.sideSheetOpen = true;
    this.searchQuery = '';
    this.searchResults = [];
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
      fechaInicio: '',
      fechaFin: '',
      serie: '',
      montoMin: null,
      montoMax: null,
      metodoPago: '',
      formaPago: ''
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
      .buscarCfdisIngresos(query)
      .pipe(finalize(() => (this.isSearching = false)))
      .subscribe({
        next: (response: any) => {
          this.searchResults = response?.success ? response.cfdis || [] : [];
        },
        error: (error) => {
          console.error('❌ Error en búsqueda rápida:', error);
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
      alert('Por favor, ingresa al menos un criterio de búsqueda');
      return;
    }

    this.isSearching = true;

    this.cfdiApiService
      .busquedaAvanzadaIngresos(filtros)
      .pipe(finalize(() => (this.isSearching = false)))
      .subscribe({
        next: (response: any) => {
          if (response?.success) {
            this.searchResults = response.cfdis || [];
            return;
          }

          if (response?.cfdis) {
            this.searchResults = response.cfdis || [];
            return;
          }

          this.searchResults = [];
        },
        error: (error) => {
          console.error('❌ Error en búsqueda avanzada:', error);
          this.searchResults = [];
        }
      });
  }

  private buildAdvancedFilters(): Record<string, any> {
    const filtros: Record<string, any> = {};

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

    if (this.searchFilters.serie?.trim()) {
      filtros.serie = this.searchFilters.serie.trim();
    }

    if (this.searchFilters.fechaInicio) {
      filtros.fechaInicio = this.searchFilters.fechaInicio;
    }

    if (this.searchFilters.fechaFin) {
      filtros.fechaFin = this.searchFilters.fechaFin;
    }

    if (this.searchFilters.montoMin !== null && this.searchFilters.montoMin !== undefined) {
      filtros.montoMin = this.searchFilters.montoMin;
    }

    if (this.searchFilters.montoMax !== null && this.searchFilters.montoMax !== undefined) {
      filtros.montoMax = this.searchFilters.montoMax;
    }

    if (this.searchFilters.metodoPago) {
      filtros.metodoPago = this.searchFilters.metodoPago;
    }

    if (this.searchFilters.formaPago) {
      filtros.formaPago = this.searchFilters.formaPago;
    }

    return filtros;
  }

  // =========================================================
  // CFDI DETAIL
  // =========================================================
  selectCfdi(cfdi: CfdiDetalle): void {
    this.selectedCfdi = { ...cfdi };
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

    const pagosRequest =
      this.selectedCfdi?.metodo_pago === 'PPD'
        ? this.cfdiApiService.getPagosCfdi(uuid).pipe(
            catchError((error) => {
              console.error('❌ Error cargando pagos:', error);
              return of({ success: false, pagos: [] });
            })
          )
        : of({ success: true, pagos: [] });

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
      ),
      pagos: pagosRequest
    }).subscribe({
      next: ({ impuestos, retenciones, partidas, pagos }) => {
        if (!this.selectedCfdi) {
          return;
        }

        this.selectedCfdi = {
          ...this.selectedCfdi,
          impuestos: impuestos?.success ? impuestos.impuestos || [] : [],
          retenciones: retenciones?.success ? retenciones.retenciones || [] : [],
          conceptos_detalle: partidas?.success ? partidas.partidas || [] : [],
          pagos: pagos?.success ? pagos.pagos || [] : []
        };
      },
      error: (error) => {
        console.error('❌ Error cargando detalle completo del CFDI:', error);
      }
    });
  }

  // =========================================================
  // DOWNLOADS
  // =========================================================
  descargarXml(cfdi: CfdiDetalle): void {
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

  descargarPdf(cfdi: CfdiDetalle): void {
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
  // CFDI HELPERS
  // =========================================================
  tieneRetenciones(cfdi: CfdiDetalle | null): boolean {
    if (!cfdi) {
      return false;
    }

    return (
      (cfdi.iva_retenido || 0) > 0 ||
      (cfdi.isr_retenido || 0) > 0 ||
      (cfdi.ieps_retenido || 0) > 0
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

  calcularSaldoPendiente(cfdi: CfdiDetalle | null): number {
    if (!cfdi || cfdi.metodo_pago !== 'PPD') {
      return 0;
    }

    const total = cfdi.total || 0;
    const pagado =
      cfdi.pagos?.reduce((sum: number, pago: PagoCfdi) => sum + (pago.monto || 0), 0) || 0;

    return Math.max(total - pagado, 0);
  }

  getPorcentajePagado(cfdi: CfdiDetalle | null): number {
    if (!cfdi || cfdi.metodo_pago !== 'PPD' || !cfdi.total) {
      return 0;
    }

    const pagado =
      cfdi.pagos?.reduce((sum: number, pago: PagoCfdi) => sum + (pago.monto || 0), 0) || 0;

    return this.getSafePercentage(pagado, cfdi.total);
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

  formatCurrency(amount: number | null | undefined): string {
    return this.currencyFormatter.format(amount ?? 0);
  }

  formatNumber(num: number | null | undefined): string {
    return this.numberFormatter.format(num ?? 0);
  }

  formatPercentage(num: number | null | undefined): string {
    return `${(num ?? 0).toFixed(2)}%`;
  }

  formatDate(date: string | Date | null | undefined): string {
    if (!date) {
      return '-';
    }

    return new Date(date).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
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
  // SAT CATALOG LABELS
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
      I02: 'Mobiliario y equipo de oficina por inversiones',
      I03: 'Equipo de transporte',
      I04: 'Equipo de cómputo y accesorios',
      I05: 'Dados, troqueles, moldes, matrices y herramental',
      I06: 'Comunicaciones telefónicas',
      I07: 'Comunicaciones satelitales',
      I08: 'Otra maquinaria y equipo',
      D01: 'Honorarios médicos, dentales y gastos hospitalarios',
      D02: 'Gastos médicos por incapacidad o discapacidad',
      D03: 'Gastos funerales',
      D04: 'Donativos',
      D05: 'Intereses reales efectivamente pagados por créditos hipotecarios',
      D06: 'Aportaciones voluntarias al SAR',
      D07: 'Primas por seguros de gastos médicos',
      D08: 'Gastos de transportación escolar obligatoria',
      D09: 'Depósitos en cuentas para el ahorro',
      D10: 'Pagos por servicios educativos',
      S01: 'Sin efectos fiscales',
      CP01: 'Pagos',
      CN01: 'Nómina',
      P01: 'Por definir'
    };

    return usos[codigo] || codigo;
  }
}

