import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CfdiApiService } from '../../services/cfdi-api.service';
import { firstValueFrom } from 'rxjs';

interface KpiCard {
  title: string;
  value: string;
  subtitle: string;
  icon: string;
  color: 'primary' | 'success' | 'danger' | 'info';
}

interface MesData {
  mes: string;
  ingresos: number;
  egresos: number;
}

interface Alerta {
  tipo: 'warning' | 'danger' | 'info';
  icono: string;
  titulo: string;
  detalle: string;
  ruta?: string;
}

const CACHE_KEY = 'kaptah_dashboard_cache';
const CACHE_TTL = 30 * 60 * 1000; // 30 minutos

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
  standalone: false
})
export class DashboardComponent implements OnInit {

  isLoading = true;
  hasDatos = false;

  // KPIs
  kpiCards: KpiCard[] = [];

  // Grafica mensual
  chartData: any[] = [];
  colorScheme: any = { domain: ['#10b981', '#ef4444'] };

  // Alertas
  alertas: Alerta[] = [];

  // Periodo
  fechaInicio = '';
  fechaFin = '';

  // Datos crudos para cache
  private datosIngresos: any = null;
  private datosEgresos: any = null;

  constructor(
    private cfdiApiService: CfdiApiService,
    private router: Router
  ) {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    this.fechaInicio = startOfYear.toISOString().split('T')[0];
    this.fechaFin = now.toISOString().split('T')[0];
  }

  async ngOnInit() {
    await this.loadDashboard();
  }

  /**
   * Carga datos: primero intenta cache, si no, fetch
   */
  async loadDashboard(forceRefresh = false) {
    this.isLoading = true;

    if (!forceRefresh) {
      const cached = this.getFromCache();
      if (cached) {
        this.datosIngresos = cached.ingresos;
        this.datosEgresos = cached.egresos;
        this.buildDashboard();
        this.isLoading = false;
        return;
      }
    }

    await this.fetchFromApi();
    this.isLoading = false;
  }

  /**
   * Fetch paralelo: solo 2 llamadas
   */
  private async fetchFromApi() {
    try {
      const [ingresosRes, egresosRes] = await Promise.all([
        firstValueFrom(this.cfdiApiService.getAnalisisCompletoIngresos(this.fechaInicio, this.fechaFin)),
        firstValueFrom(this.cfdiApiService.getAnalisisCompletoEgresos(this.fechaInicio, this.fechaFin))
      ]);

      this.datosIngresos = ingresosRes?.success ? ingresosRes.analisis : null;
      this.datosEgresos = egresosRes?.success ? egresosRes.analisis : null;

      // Guardar en cache
      this.saveToCache({
        ingresos: this.datosIngresos,
        egresos: this.datosEgresos
      });

      this.buildDashboard();
    } catch (error) {
      console.error('Error cargando dashboard:', error);
      this.hasDatos = false;
    }
  }

  /**
   * Construye KPIs, grafica y alertas a partir de datos crudos
   */
  private buildDashboard() {
    if (!this.datosIngresos && !this.datosEgresos) {
      this.hasDatos = false;
      return;
    }

    this.hasDatos = true;

    const resIngresos = this.datosIngresos?.resumenGeneral || {};
    const resEgresos = this.datosEgresos?.resumenGeneral || {};
    const infoFiscal = this.datosEgresos?.informacionFiscal || {};

    const totalIngresos = resIngresos.total || 0;
    const totalEgresos = resEgresos.total || 0;
    const utilidadBruta = totalIngresos - totalEgresos;

    // IVA Neto correcto: trasladado (cobrado) - acreditable (pagado)
    const ivaTrasladado = resIngresos.ivaTotal || 0;
    const ivaAcreditable = infoFiscal.ivaAcreditable || 0;
    const ivaNeto = ivaTrasladado - ivaAcreditable;

    // KPIs
    this.kpiCards = [
      {
        title: 'Ingresos',
        value: this.formatCurrency(totalIngresos),
        subtitle: `${this.formatNumber(resIngresos.totalCfdis || 0)} CFDIs emitidos`,
        icon: 'trending_up',
        color: 'success'
      },
      {
        title: 'Egresos',
        value: this.formatCurrency(totalEgresos),
        subtitle: `${this.formatNumber(resEgresos.totalCfdis || 0)} CFDIs recibidos`,
        icon: 'trending_down',
        color: 'danger'
      },
      {
        title: 'Utilidad Bruta',
        value: this.formatCurrency(utilidadBruta),
        subtitle: utilidadBruta >= 0 ? 'Ingresos > Egresos' : 'Egresos > Ingresos',
        icon: utilidadBruta >= 0 ? 'account_balance' : 'warning',
        color: utilidadBruta >= 0 ? 'primary' : 'danger'
      },
      {
        title: 'IVA Neto',
        value: this.formatCurrency(Math.abs(ivaNeto)),
        subtitle: ivaNeto > 0 ? 'Por pagar al SAT' : ivaNeto < 0 ? 'A favor' : 'Saldo cero',
        icon: ivaNeto > 0 ? 'payments' : 'savings',
        color: ivaNeto > 0 ? 'danger' : 'info'
      }
    ];

    // Grafica mensual comparativa
    this.buildChartData();

    // Alertas accionables
    this.buildAlertas(resIngresos, resEgresos);
  }

  /**
   * Construye datos para grafica de barras agrupadas Ingresos vs Egresos por mes
   */
  private buildChartData() {
    const temporalIngresos = this.datosIngresos?.analisisTemporal || [];
    const temporalEgresos = this.datosEgresos?.analisisTemporal || [];

    // Obtener todos los periodos unicos
    const periodosSet = new Set<string>();
    temporalIngresos.forEach((t: any) => periodosSet.add(t.periodo));
    temporalEgresos.forEach((t: any) => periodosSet.add(t.periodo));

    const periodos = Array.from(periodosSet).sort();

    // Construir series para ngx-charts bar-vertical-2d
    this.chartData = periodos.map(periodo => {
      const ing = temporalIngresos.find((t: any) => t.periodo === periodo);
      const egr = temporalEgresos.find((t: any) => t.periodo === periodo);

      return {
        name: this.formatPeriodo(periodo),
        series: [
          { name: 'Ingresos', value: ing?.total || 0 },
          { name: 'Egresos', value: egr?.total || 0 }
        ]
      };
    });
  }

  /**
   * Genera alertas accionables
   */
  private buildAlertas(resIngresos: any, resEgresos: any) {
    this.alertas = [];

    // CFDIs cancelados
    const canceladosIng = resIngresos.cfdisCancelados || 0;
    const canceladosEgr = resEgresos.cfdisCancelados || 0;
    const totalCancelados = canceladosIng + canceladosEgr;

    if (totalCancelados > 0) {
      this.alertas.push({
        tipo: 'warning',
        icono: 'cancel',
        titulo: `${totalCancelados} CFDI${totalCancelados > 1 ? 's' : ''} cancelado${totalCancelados > 1 ? 's' : ''}`,
        detalle: `${canceladosIng} de ingresos, ${canceladosEgr} de egresos`,
        ruta: undefined
      });
    }

    // Monto cancelado significativo
    const montoCancelado = resIngresos.montoCancelados || 0;
    if (montoCancelado > 0) {
      this.alertas.push({
        tipo: 'danger',
        icono: 'money_off',
        titulo: `${this.formatCurrency(montoCancelado)} en ingresos cancelados`,
        detalle: 'Revisa los detalles en el modulo de Ingresos',
        ruta: '/ingresos'
      });
    }

    // Proveedores nuevos
    const provNuevos = this.datosEgresos?.proveedoresNuevos || [];
    if (provNuevos.length > 0) {
      this.alertas.push({
        tipo: 'info',
        icono: 'person_add',
        titulo: `${provNuevos.length} proveedor${provNuevos.length > 1 ? 'es' : ''} nuevo${provNuevos.length > 1 ? 's' : ''}`,
        detalle: 'Detectados en el periodo actual',
        ruta: '/egresos'
      });
    }

    // Porcentaje de vigentes bajo
    const pctVigentes = resIngresos.porcentajeVigentes || 100;
    if (pctVigentes < 90 && resIngresos.totalCfdis > 0) {
      this.alertas.push({
        tipo: 'warning',
        icono: 'error_outline',
        titulo: `Solo ${this.formatPercentage(pctVigentes)} de CFDIs vigentes`,
        detalle: 'El porcentaje de cancelacion es alto',
        ruta: '/ingresos'
      });
    }
  }

  // ==========================================
  // CACHE
  // ==========================================

  private getFromCache(): any | null {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;

      const { data, timestamp, periodo } = JSON.parse(raw);

      // Validar TTL
      if (Date.now() - timestamp > CACHE_TTL) return null;

      // Validar que el periodo no cambio
      if (periodo?.fechaInicio !== this.fechaInicio || periodo?.fechaFin !== this.fechaFin) {
        return null;
      }

      return data;
    } catch {
      return null;
    }
  }

  private saveToCache(data: any) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        data,
        timestamp: Date.now(),
        periodo: { fechaInicio: this.fechaInicio, fechaFin: this.fechaFin }
      }));
    } catch (e) {
      console.warn('No se pudo guardar cache del dashboard:', e);
    }
  }

  // ==========================================
  // ACCIONES
  // ==========================================

  async onRefresh() {
    await this.loadDashboard(true);
  }

  async onFechaChange() {
    await this.loadDashboard(true);
  }

  navigateTo(ruta: string | undefined) {
    if (ruta) {
      this.router.navigate([ruta]);
    }
  }

  // ==========================================
  // FORMATEO
  // ==========================================

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }

  formatNumber(num: number): string {
    return new Intl.NumberFormat('es-MX').format(num);
  }

  formatPercentage(value: number): string {
    return `${value.toFixed(1)}%`;
  }

  formatPeriodo(periodo: string): string {
    if (!periodo) return '';
    const meses: Record<string, string> = {
      '01': 'Ene', '02': 'Feb', '03': 'Mar', '04': 'Abr',
      '05': 'May', '06': 'Jun', '07': 'Jul', '08': 'Ago',
      '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dic'
    };
    const parts = periodo.split('-');
    if (parts.length === 2) {
      return `${meses[parts[1]] || parts[1]} ${parts[0]}`;
    }
    return periodo;
  }
}
