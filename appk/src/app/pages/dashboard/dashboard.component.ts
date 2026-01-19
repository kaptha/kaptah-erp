import { Component, OnInit } from '@angular/core';
import { CfdiApiService } from '../../services/cfdi-api.service';
import { firstValueFrom } from 'rxjs';

interface KpiCard {
  title: string;
  value: string;
  change: string;
  isPositive: boolean;
}

interface ChartData {
  name: string;
  value: number;
}

@Component({
    selector: 'app-dashboard',
    templateUrl: './dashboard.component.html',
    styleUrls: ['./dashboard.component.css'],
    standalone: false
})
export class DashboardComponent implements OnInit {
  
  // Loading states
  isLoading = true;
  isProcessing = false;
  
  // User RFC
  userRfc = '';
  
  // KPI Cards data
  kpiCards: KpiCard[] = [
    { title: 'XMLs Procesados', value: '0', change: 'Total importados', isPositive: true },
    { title: 'Ingresos Totales', value: '$0', change: 'Este año', isPositive: true },
    { title: 'Egresos Totales', value: '$0', change: 'Este año', isPositive: false },
    { title: 'IVA Neto', value: '$0', change: 'A favor/por pagar', isPositive: true }
  ];

  // Chart data para tipos de comprobante
  pieChartData: ChartData[] = [
    { name: "Ingresos", value: 0 },
    { name: "Egresos", value: 0 }
  ];

  // Top proveedores para tabla
  topProveedores: any[] = [];

  // Filtros de fecha - año actual por defecto
  fechaInicio = '';
  fechaFin = '';

  constructor(private cfdiApiService: CfdiApiService) {
    // Configurar fechas por defecto (año actual)
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    this.fechaInicio = startOfYear.toISOString().split('T')[0];
    this.fechaFin = now.toISOString().split('T')[0];
    
    // Obtener RFC del usuario
    this.userRfc = this.getUserRfc();
  }

  async ngOnInit() {
    console.log('🔹 Iniciando dashboard...');
    console.log('🔹 RFC Usuario:', this.userRfc);
    console.log('🔹 Período:', this.fechaInicio, 'a', this.fechaFin);
    
    this.loadDashboardData();
  }

  /**
   * Obtiene el RFC del usuario desde localStorage
   */
  private getUserRfc(): string {
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        return user.rfc || 'DIVM801101RJ9';
      }
    } catch (error) {
      console.error('Error obteniendo RFC:', error);
    }
    return 'DIVM801101RJ9';
  }

  /**
   * Carga todos los datos del dashboard
   */
  async loadDashboardData() {
    try {
      this.isLoading = true;
      console.log('📊 Cargando datos del dashboard...');
      
      // Cargar análisis de ingresos y egresos usando los endpoints correctos
      await this.loadAnalisisIngresos();
      await this.loadAnalisisEgresos();
      
      // Cargar top proveedores
      await this.loadTopProveedores();
      
      console.log('✅ Datos del dashboard cargados');
    } catch (error: any) {
      console.error('❌ Error cargando datos del dashboard:', error);
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Carga análisis de INGRESOS
   */
  async loadAnalisisIngresos() {
    try {
      console.log('💰 Cargando análisis de ingresos...');
      const response = await firstValueFrom(
        this.cfdiApiService.getAnalisisCompletoIngresos(this.fechaInicio, this.fechaFin)
      );
      
      console.log('💰 Respuesta ingresos:', response);
      
      if (response && response.success && response.analisis) {
        const resumen = response.analisis.resumenGeneral;
        
        // Actualizar KPI de ingresos
        this.kpiCards[1].value = this.formatCurrency(resumen.total || 0);
        this.kpiCards[1].change = `${resumen.totalCfdis || 0} CFDIs`;
        
        // Actualizar pie chart - INGRESOS
        this.pieChartData[0].value = resumen.totalCfdis || 0;
        
        console.log('✅ Análisis de ingresos cargado');
        console.log('   - Total ingresos:', resumen.total);
        console.log('   - CFDIs ingresos:', resumen.totalCfdis);
      }
    } catch (error) {
      console.error('❌ Error cargando análisis de ingresos:', error);
    }
  }

  /**
   * Carga análisis de EGRESOS
   */
  async loadAnalisisEgresos() {
    try {
      console.log('💸 Cargando análisis de egresos...');
      const response = await firstValueFrom(
        this.cfdiApiService.getAnalisisCompletoEgresos(this.fechaInicio, this.fechaFin)
      );
      
      console.log('💸 Respuesta egresos:', response);
      
      if (response && response.success && response.analisis) {
        const resumen = response.analisis.resumenGeneral;
        const infoFiscal = response.analisis.informacionFiscal;
        
        // Actualizar KPI de egresos
        this.kpiCards[2].value = this.formatCurrency(resumen.total || 0);
        this.kpiCards[2].change = `${resumen.totalCfdis || 0} CFDIs`;
        
        // Actualizar pie chart - EGRESOS
        this.pieChartData[1].value = resumen.totalCfdis || 0;
        
        // Calcular IVA Neto
        // IVA Acreditable (de egresos) - IVA Trasladado (de ingresos)
        const ivaAcreditable = infoFiscal?.ivaAcreditable || 0;
        const ivaTrasladadoIngresos = parseFloat(this.kpiCards[1].value.replace(/[^0-9.-]+/g, '')) * 0.16 || 0;
        
        const ivaNeto = ivaAcreditable - ivaTrasladadoIngresos;
        this.kpiCards[3].value = this.formatCurrency(Math.abs(ivaNeto));
        this.kpiCards[3].isPositive = ivaNeto < 0; // Negativo es a favor
        this.kpiCards[3].change = ivaNeto < 0 ? 'A favor' : 'Por pagar';
        
        // Actualizar KPI de XMLs procesados (total de ambos)
        const totalCfdis = (this.pieChartData[0].value || 0) + (this.pieChartData[1].value || 0);
        this.kpiCards[0].value = totalCfdis.toString();
        
        console.log('✅ Análisis de egresos cargado');
        console.log('   - Total egresos:', resumen.total);
        console.log('   - CFDIs egresos:', resumen.totalCfdis);
        console.log('   - IVA Acreditable:', ivaAcreditable);
        console.log('   - IVA Neto:', ivaNeto);
      }
    } catch (error) {
      console.error('❌ Error cargando análisis de egresos:', error);
    }
  }

  /**
   * Carga top proveedores desde el análisis de egresos
   */
  async loadTopProveedores() {
    try {
      console.log('🏆 Cargando top proveedores...');
      const response = await firstValueFrom(
        this.cfdiApiService.getAnalisisCompletoEgresos(this.fechaInicio, this.fechaFin)
      );
      
      if (response && response.success && response.analisis) {
        const topProveedoresPorMonto = response.analisis.topProveedoresPorMonto || [];
        
        // Transformar datos para la tabla
        this.topProveedores = topProveedoresPorMonto.map((proveedor: any) => ({
          rfc: proveedor.rfc,
          nombre: proveedor.nombre,
          cantidad_facturas: proveedor.cantidad,
          total_gastado: proveedor.totalMonto
        }));
        
        console.log('✅ Top proveedores cargados:', this.topProveedores.length);
      }
    } catch (error) {
      console.error('❌ Error cargando top proveedores:', error);
    }
  }

  /**
   * Procesa todos los XMLs importados
   */
  async procesarXmls() {
    try {
      this.isProcessing = true;
      console.log('⚙️ Procesando XMLs...');
      
      const response = await firstValueFrom(this.cfdiApiService.procesarTodosLosXmls());
      
      console.log('⚙️ Respuesta procesamiento:', response);
      
      if (response && response.success) {
        console.log('✅ XMLs procesados exitosamente:', response.resultado);
        alert(`XMLs procesados exitosamente!\n\nTotal: ${response.resultado.totalProcesados}\nExitosos: ${response.resultado.exitosos}\nErrores: ${response.resultado.errores}`);
        
        // Recargar datos después del procesamiento
        await this.loadDashboardData();
      }
    } catch (error) {
      console.error('❌ Error procesando XMLs:', error);
      alert('Error al procesar XMLs. Revisa la consola para más detalles.');
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Importa nuevos XMLs
   */
  async importarXmls() {
    // Aquí abrir dialog para seleccionar carpeta
    // Por ahora usar ruta fija
    const rutaBase = "C:\\Users\\Mario\\OneDrive\\Documentos\\LizBetXML\\DIVM801101RJ9";
    
    try {
      console.log('📥 Importando XMLs desde:', rutaBase);
      
      const response = await firstValueFrom(
        this.cfdiApiService.importarEstructuraCompleta(rutaBase)
      );
      
      console.log('📥 Respuesta importación:', response);
      
      if (response && response.success) {
        console.log('✅ XMLs importados exitosamente:', response.resultado);
        alert(`XMLs importados exitosamente!\n\nTotal: ${response.resultado.totalProcesados}\nExitosos: ${response.resultado.exitosos}\nErrores: ${response.resultado.errores}`);
        
        await this.loadDashboardData();
      }
    } catch (error) {
      console.error('❌ Error importando XMLs:', error);
      alert('Error al importar XMLs. Revisa la consola para más detalles.');
    }
  }

  /**
   * Actualiza el período de análisis
   */
  async onFechaChange() {
    console.log('📅 Cambiando fechas:', this.fechaInicio, 'a', this.fechaFin);
    await this.loadDashboardData();
  }

  /**
   * Formatea números como moneda
   */
  public formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  }

  /**
   * Formatea números
   */
  public formatNumber(num: number): string {
    return new Intl.NumberFormat('es-MX').format(num);
  }
}