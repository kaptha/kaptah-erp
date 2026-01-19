import { Component, OnInit } from '@angular/core';
import { CfdiApiService } from '../../services/cfdi-api.service';
import { FormControl } from '@angular/forms';

@Component({
    selector: 'app-ingresos',
    templateUrl: './ingresos.component.html',
    styleUrls: ['./ingresos.component.css'],
    standalone: false
})
export class IngresosComponent implements OnInit {
  rfcFilterControl = new FormControl('');
  nombreFilterControl = new FormControl('');
  // Estados
  isLoading = false;
  
  // Filtros
  fechaInicioControl = new FormControl('');
  fechaFinControl = new FormControl('');
  
  // Datos del análisis completo
  analisisCompleto: any = null;
  
  // Resumen General
  resumenGeneral: any = {
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
  
  // Top Clientes
  topClientesPorMonto: any[] = [];
  topClientesPorCantidad: any[] = [];
  
  // Análisis Temporal
  analisisTemporal: any[] = [];
  chartDataTemporal: any[] = [];
  
  // Clasificaciones
  porFormaPago: any[] = [];
  porMetodoPago: any[] = [];
  porUsoCfdi: any[] = [];
  
  // Retenciones
  retenciones: any = {
    ivaRetenido: 0,
    isrRetenido: 0,
    iepsRetenido: 0,
    totalRetenido: 0
  };
  
  // Clientes Inactivos
  clientesInactivos: any[] = [];

  // Configuración de gráficas
  colorScheme: any = {
    domain: ['#5AA454', '#A10A28', '#C7B42C', '#AAAAAA']
  };
  // ====== SIDE SHEET DE BÚSQUEDA AVANZADA ======
  sideSheetOpen = false;
  searchQuery = '';
  searchResults: any[] = [];
  isSearching = false;
  selectedCfdi: any = null;
  detailPanelOpen = false;
  
  // Filtros de búsqueda avanzada
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
    metodoPago: '', // PUE o PPD
    formaPago: '' // 01, 02, 03, etc.
  };

  constructor(private cfdiApiService: CfdiApiService) {}

  ngOnInit(): void {
    this.initializeComponent();
  }

  /**
   * Inicializa el componente
   */
  private initializeComponent(): void {
    // Configurar fechas por defecto (año actual)
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    this.fechaInicioControl.setValue(startOfYear.toISOString().split('T')[0]);
    this.fechaFinControl.setValue(now.toISOString().split('T')[0]);

    // Cargar análisis completo
    this.loadAnalisisCompleto();
  }

  /**
   * Carga el análisis completo de ingresos
   */
  loadAnalisisCompleto(): void {
    this.isLoading = true;
    
    const fechaInicio = this.fechaInicioControl.value || '';
    const fechaFin = this.fechaFinControl.value || '';

    console.log('📊 Cargando análisis completo de ingresos...');

    this.cfdiApiService.getAnalisisCompletoIngresos(fechaInicio, fechaFin).subscribe({
      next: (response) => {
        console.log('✅ Análisis completo cargado:', response);
        
        if (response && response.success) {
          this.analisisCompleto = response.analisis;
          this.processAnalisisData();
        }
        
        this.isLoading = false;
      },
      error: (error) => {
        console.error('❌ Error cargando análisis:', error);
        this.isLoading = false;
      }
    });
  }

  /**
   * Procesa los datos del análisis
   */
  private processAnalisisData(): void {
    if (!this.analisisCompleto) return;

    // Resumen General
    this.resumenGeneral = this.analisisCompleto.resumenGeneral || this.resumenGeneral;

    // Top Clientes
    this.topClientesPorMonto = this.analisisCompleto.topClientesPorMonto || [];
    this.topClientesPorCantidad = this.analisisCompleto.topClientesPorCantidad || [];

    // Análisis Temporal
    this.analisisTemporal = this.analisisCompleto.analisisTemporal || [];
    this.prepareChartData();

    // Clasificaciones
    this.porFormaPago = this.analisisCompleto.porFormaPago || [];
    this.porMetodoPago = this.analisisCompleto.porMetodoPago || [];
    this.porUsoCfdi = this.analisisCompleto.porUsoCfdi || [];

    // Retenciones
    this.retenciones = this.analisisCompleto.retenciones || this.retenciones;

    // Clientes Inactivos
    this.clientesInactivos = this.analisisCompleto.clientesInactivos || [];
  }

  /**
   * Prepara datos para las gráficas
   */
  private prepareChartData(): void {
    // Gráfica de tendencia temporal
    this.chartDataTemporal = [{
      name: 'Ingresos',
      series: this.analisisTemporal.map(item => ({
        name: this.formatPeriodo(item.periodo),
        value: item.total
      }))
    }];
  }

  /**
   * Maneja el cambio de fechas
   */
  onFechaChange(): void {
    this.loadAnalisisCompleto();
  }

  /**
   * Exporta a Excel
   */
  exportToExcel(): void {
    console.log('📊 Exportando análisis a Excel...');
    // TODO: Implementar exportación
    alert('Funcionalidad de exportación en desarrollo');
  }

  /**
   * Formatea el período (2025-01 → Ene 2025)
   */
  formatPeriodo(periodo: string): string {
    const [year, month] = periodo.split('-');
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return `${meses[parseInt(month) - 1]} ${year}`;
  }

  /**
   * Formatea un número como moneda
   */
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2
    }).format(amount);
  }

  /**
   * Formatea un número
   */
  formatNumber(num: number): string {
    return new Intl.NumberFormat('es-MX').format(num);
  }

  /**
   * Formatea un porcentaje
   */
  formatPercentage(num: number): string {
    return `${num.toFixed(2)}%`;
  }

  /**
   * Obtiene la etiqueta de forma de pago
   */
  getFormaPagoLabel(codigo: string): string {
    const formasPago: { [key: string]: string } = {
      '01': 'Efectivo',
      '02': 'Cheque',
      '03': 'Transferencia',
      '04': 'Tarjeta de Crédito',
      '28': 'Tarjeta de Débito',
      '99': 'Por Definir'
    };
    return formasPago[codigo] || codigo;
  }

  /**
   * Obtiene la etiqueta de método de pago
   */
  getMetodoPagoLabel(codigo: string): string {
    const metodos: { [key: string]: string } = {
      'PUE': 'Pago en una sola exhibición',
      'PPD': 'Pago en parcialidades o diferido'
    };
    return metodos[codigo] || codigo;
  }

  /**
   * Obtiene la etiqueta de uso de CFDI
   */
  getUsoCfdiLabel(codigo: string): string {
    const usos: { [key: string]: string } = {
      'G01': 'Adquisición de mercancías',
      'G02': 'Devoluciones, descuentos o bonificaciones',
      'G03': 'Gastos en general',
      'I01': 'Construcciones',
      'I02': 'Mobiliario y equipo de oficina',
      'P01': 'Por definir'
    };
    return usos[codigo] || codigo;
  }
  // ====== MÉTODOS DEL SIDE SHEET DE BÚSQUEDA AVANZADA ======

  /**
   * Abre el side sheet de búsqueda
   */
  openSearchPanel(): void {
    this.sideSheetOpen = true;
    this.searchQuery = '';
    this.searchResults = [];
  }

  /**
   * Cierra el side sheet de búsqueda
   */
  closeSearchPanel(): void {
    this.sideSheetOpen = false;
    this.searchQuery = '';
    this.searchResults = [];
    this.resetSearchFilters();
  }

  /**
   * Resetea los filtros de búsqueda
   */
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

  /**
   * Búsqueda en tiempo real (autocomplete)
   */
  onSearchChange(): void {
    const query = this.searchQuery.trim();
    
    if (query.length < 3) {
      this.searchResults = [];
      return;
    }

    this.isSearching = true;
    
    // Llamada al servicio para búsqueda rápida
    this.cfdiApiService.buscarCfdisIngresos(query).subscribe({
      next: (response) => {
        if (response && response.success) {
          this.searchResults = response.cfdis || [];
        }
        this.isSearching = false;
      },
      error: (error) => {
        console.error('❌ Error en búsqueda:', error);
        this.isSearching = false;
      }
    });
  }

  /**
   * Búsqueda avanzada con filtros
   */
  buscarAvanzado(): void {
  console.log('🔍 ===== MÉTODO buscarAvanzado LLAMADO =====');
  console.log('🔍 searchFilters COMPLETO:', this.searchFilters);
  console.log('🔍 searchFilters.rfc:', this.searchFilters.rfc);
  console.log('🔍 searchFilters.nombre:', this.searchFilters.nombre);
  console.log('🔍 searchFilters.uuid:', this.searchFilters.uuid);
  
  this.isSearching = true;
  
  // Construir objeto de filtros (solo los que tienen valor)
  const filtros: any = {};
  
  if (this.searchFilters.rfc && this.searchFilters.rfc.trim()) {
    filtros.rfc = this.searchFilters.rfc.trim();
    console.log('✅ RFC agregado:', filtros.rfc);
  }
  if (this.searchFilters.nombre && this.searchFilters.nombre.trim()) {
    filtros.nombre = this.searchFilters.nombre.trim();
    console.log('✅ Nombre agregado:', filtros.nombre);
  }
  if (this.searchFilters.uuid && this.searchFilters.uuid.trim()) {
    filtros.uuid = this.searchFilters.uuid.trim();
    console.log('✅ UUID agregado:', filtros.uuid);
  }
  if (this.searchFilters.folio && this.searchFilters.folio.trim()) {
    filtros.folio = this.searchFilters.folio.trim();
    console.log('✅ Folio agregado:', filtros.folio);
  }
  if (this.searchFilters.fechaInicio) {
    filtros.fechaInicio = this.searchFilters.fechaInicio;
    console.log('✅ FechaInicio agregada:', filtros.fechaInicio);
  }
  if (this.searchFilters.fechaFin) {
    filtros.fechaFin = this.searchFilters.fechaFin;
    console.log('✅ FechaFin agregada:', filtros.fechaFin);
  }
  if (this.searchFilters.serie && this.searchFilters.serie.trim()) {
    filtros.serie = this.searchFilters.serie.trim();
    console.log('✅ Serie agregada:', filtros.serie);
  }
  if (this.searchFilters.montoMin !== null && this.searchFilters.montoMin !== undefined) {
    filtros.montoMin = this.searchFilters.montoMin;
    console.log('✅ MontoMin agregado:', filtros.montoMin);
  }
  if (this.searchFilters.montoMax !== null && this.searchFilters.montoMax !== undefined) {
    filtros.montoMax = this.searchFilters.montoMax;
    console.log('✅ MontoMax agregado:', filtros.montoMax);
  }
  if (this.searchFilters.metodoPago) {
    filtros.metodoPago = this.searchFilters.metodoPago;
    console.log('✅ MetodoPago agregado:', filtros.metodoPago);
  }
  if (this.searchFilters.formaPago) {
    filtros.formaPago = this.searchFilters.formaPago;
    console.log('✅ FormaPago agregada:', filtros.formaPago);
  }

  console.log('🔍 Filtros finales a enviar:', filtros);
  console.log('🔍 Cantidad de filtros:', Object.keys(filtros).length);

  // Validar que haya al menos un filtro
  if (Object.keys(filtros).length === 0) {
    console.warn('⚠️ No hay filtros para buscar');
    this.isSearching = false;
    alert('Por favor, ingrese al menos un criterio de búsqueda');
    return;
  }

  this.cfdiApiService.busquedaAvanzadaIngresos(filtros).subscribe({
    next: (response) => {
      console.log('✅ Respuesta recibida:', response);
      if (response && response.success) {
        this.searchResults = response.cfdis || [];
        console.log(`✅ Se encontraron ${this.searchResults.length} resultados`);
      } else if (response && response.cfdis) {
        // Si no tiene 'success' pero tiene 'cfdis'
        this.searchResults = response.cfdis || [];
        console.log(`✅ Se encontraron ${this.searchResults.length} resultados (sin success flag)`);
      }
      this.isSearching = false;
    },
    error: (error) => {
      console.error('❌ Error en búsqueda avanzada:', error);
      this.isSearching = false;
    }
  });
}

 /**
 * Selecciona un CFDI de los resultados
 */
selectCfdi(cfdi: any): void {
  console.log('📋 CFDI seleccionado:', cfdi);
  console.log('📋 Tiene folio_fiscal?:', !!cfdi.folio_fiscal);
  console.log('📋 folio_fiscal value:', cfdi.folio_fiscal);
  
  this.selectedCfdi = cfdi;
  this.detailPanelOpen = true;
  
  // Cargar información adicional del CFDI (solo si hay folio_fiscal)
  if (cfdi.folio_fiscal) {
    this.loadCfdiDetails(cfdi.folio_fiscal);
  }
}

  /**
   * Carga los detalles completos del CFDI seleccionado
   */
  loadCfdiDetails(uuid: string): void {
    // Cargar impuestos
    this.cfdiApiService.getImpuestosCfdi(uuid).subscribe({
      next: (response) => {
        if (response && response.success && this.selectedCfdi) {
          this.selectedCfdi.impuestos = response.impuestos;
        }
      }
    });

    // Cargar retenciones
    this.cfdiApiService.getRetencionesCfdi(uuid).subscribe({
      next: (response) => {
        if (response && response.success && this.selectedCfdi) {
          this.selectedCfdi.retenciones = response.retenciones;
        }
      }
    });

    // Cargar partidas
    this.cfdiApiService.getPartidasCfdi(uuid).subscribe({
      next: (response) => {
        if (response && response.success && this.selectedCfdi) {
          this.selectedCfdi.partidas = response.partidas;
        }
      }
    });

    // Si es PPD, cargar pagos relacionados
    if (this.selectedCfdi?.metodo_pago === 'PPD') {
      this.cfdiApiService.getPagosCfdi(uuid).subscribe({
        next: (response) => {
          if (response && response.success && this.selectedCfdi) {
            this.selectedCfdi.pagos = response.pagos;
          }
        }
      });
    }
  }

  /**
   * Cierra el panel de detalles
   */
  closeDetailPanel(): void {
    this.detailPanelOpen = false;
    this.selectedCfdi = null;
  }

  
  /**
 * Descarga el XML del CFDI
 */
descargarXml(cfdi: any): void {
  console.log('📥 Objeto CFDI completo:', cfdi);
  console.log('📥 UUID a descargar:', cfdi.folio_fiscal);
  console.log('📥 Tipo de UUID:', typeof cfdi.folio_fiscal);
  
  if (!cfdi.folio_fiscal) {
    alert('Error: UUID no encontrado en el CFDI');
    return;
  }
  
  this.cfdiApiService.descargarXml(cfdi.folio_fiscal).subscribe({
    next: (response) => {
      console.log('✅ Respuesta del servidor:', response);
      
      // Crear blob y descargar
      const blob = new Blob([response], { type: 'application/xml' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${cfdi.folio_fiscal}.xml`;
      link.click();
      window.URL.revokeObjectURL(url);
      
      console.log('✅ XML descargado correctamente');
    },
    error: (error) => {
      console.error('❌ Error completo:', error);
      console.error('❌ Mensaje de error:', error.message);
      alert(`Error al descargar el XML: ${error.message || 'Error desconocido'}`);
    }
  });
}
/**
 * Descarga el PDF del CFDI
 */
descargarPdf(cfdi: any): void {
  console.log('📥 Descargando PDF');
  console.log('📦 CFDI completo:', cfdi);
  console.log('📋 UUID (folio_fiscal):', cfdi.folio_fiscal);  // ✅ Debe ser folio_fiscal
  
  if (!cfdi.folio_fiscal) {
    alert('Error: El CFDI no tiene UUID (folio_fiscal)');
    console.error('❌ CFDI sin folio_fiscal:', cfdi);
    return;
  }
  
  this.cfdiApiService.descargarPdf(cfdi.folio_fiscal).subscribe({
    next: (response) => {
      console.log('✅ PDF recibido, tamaño:', response.size);
      
      // Crear blob y descargar
      const blob = new Blob([response], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${cfdi.folio_fiscal}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
      
      console.log('✅ PDF descargado correctamente');
    },
    error: (error) => {
      console.error('❌ Error descargando PDF:', error);
      alert(`Error al descargar el PDF: ${error.message || 'Error desconocido'}`);
    }
  });
}
  /**
 * Obtiene el color del badge según el estado
 */
getEstadoBadgeColor(estado: string): string {
  if (!estado) return 'accent';
  
  switch (estado.toUpperCase()) {
    case 'PROCESADO':
      return 'primary';
    case 'CANCELADO':
      return 'warn';
    case 'PENDIENTE':
      return 'accent';
    default:
      return 'accent';
  }
}

/**
 * Verifica si el CFDI tiene retenciones
 */
tieneRetenciones(cfdi: any): boolean {
  if (!cfdi) return false;
  
  return (cfdi.iva_retenido && cfdi.iva_retenido > 0) ||
         (cfdi.isr_retenido && cfdi.isr_retenido > 0) ||
         (cfdi.ieps_retenido && cfdi.ieps_retenido > 0);
}

/**
 * Calcula el saldo pendiente de un CFDI PPD
 */
calcularSaldoPendiente(cfdi: any): number {
  if (cfdi.metodo_pago !== 'PPD') return 0;
  
  const total = cfdi.total || 0;
  const pagado = cfdi.pagos?.reduce((sum: number, pago: any) => sum + (pago.monto || 0), 0) || 0;
  
  return total - pagado;
}

/**
 * Obtiene el porcentaje pagado de un CFDI PPD
 */
getPorcentajePagado(cfdi: any): number {
  if (cfdi.metodo_pago !== 'PPD' || !cfdi.total) return 0;
  
  const pagado = cfdi.pagos?.reduce((sum: number, pago: any) => sum + (pago.monto || 0), 0) || 0;
  
  return (pagado / cfdi.total) * 100;
}

/**
 * Formatea una fecha
 */
formatDate(date: string | Date): string {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('es-MX', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
}

  /**
   * Formatea el RFC (oculta caracteres del medio)
   */
  formatRfc(rfc: string): string {
    if (!rfc || rfc.length < 8) return rfc;
    const inicio = rfc.substring(0, 4);
    const fin = rfc.substring(rfc.length - 3);
    return `${inicio}***${fin}`;
  }

}


