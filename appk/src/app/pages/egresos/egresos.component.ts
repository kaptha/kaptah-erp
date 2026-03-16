import { Component, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { CfdiApiService } from '../../services/cfdi-api.service';

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

interface CfdiEgresoDetalle {
  folio_fiscal: string;
  serie?: string;
  folio?: string;
  fecha: string;
  estado_procesamiento?: string;
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
  total?: number;

  conceptos_detalle?: ConceptoCfdi[];
  impuestos?: any[];
  retenciones?: any[];
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

@Component({
  selector: 'app-egresos',
  templateUrl: './egresos.component.html',
  styleUrls: ['./egresos.component.css'],
  standalone: false
})
export class EgresosComponent implements OnInit {
  // =========================================================
  // UI STATE
  // =========================================================
  isLoading = false;
  isSearching = false;
  sideSheetOpen = false;
  detailPanelOpen = false;

  // =========================================================
  // FILTERS
  // =========================================================
  fechaInicioControl = new FormControl('');
  fechaFinControl = new FormControl('');

  searchQuery = '';
  searchFilters = {
    rfc: '',
    nombre: '',
    uuid: '',
    folio: '',
    fechaInicio: '',
    fechaFin: '',
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
      filtros.fechaInicio = this.searchFilters.fechaInicio;
    }

    if (this.searchFilters.fechaFin) {
      filtros.fechaFin = this.searchFilters.fechaFin;
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

  formatCurrency(amount: number | null | undefined): string {
    return this.currencyFormatter.format(amount ?? 0);
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
      '02': 'Cheque',
      '03': 'Transferencia',
      '04': 'Tarjeta de Crédito',
      '28': 'Tarjeta de Débito',
      '99': 'Por Definir'
    };

    return formasPago[codigo] || codigo;
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
      P01: 'Por definir'
    };

    return usos[codigo] || codigo;
  }
}