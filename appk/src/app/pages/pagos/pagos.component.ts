import { Component, OnInit, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { FormControl } from '@angular/forms'; // ✅ NUEVO
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { finalize, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { AccountsPayableService, AccountPayable } from '../../services/accounts-payable.service';
import { PagoFormModalComponent } from './pago-form-modal/pago-form-modal.component';
import { Sweetalert } from '../../functions';
import * as XLSX from 'xlsx';
import * as Papa from 'papaparse';


interface PagoDisplay {
  id: string;
  rfcProveedor: string;
  razonSocial: string;
  fecha: Date;
  vencimiento: Date;
  descripcion: string;
  monto: number;
  estado: string;
  paid_amount: number;
  credit_days: number;
  documentId?: string;
  concept?: string;
  notes?: string;
  providerInfo?: any; 
}

interface ResumenPagos {
  totalPorPagar: number;
  pendientes: number;
  vencidos: number;
  pagados: number;
}

@Component({
    selector: 'app-pagos',
    templateUrl: './pagos.component.html',
    styleUrls: ['./pagos.component.css'],
    standalone: false
})
export class PagosComponent implements OnInit {
  // Columnas de la tabla
  displayedColumns: string[] = ['rfcProveedor', 'razonSocial', 'fecha', 'vencimiento', 'descripcion', 'monto', 'actions'];
  
  // Fuente de datos para la tabla
  dataSource = new MatTableDataSource<PagoDisplay>([]);
  
  // ✅ NUEVO: Datos originales sin filtrar
  private allPagos: PagoDisplay[] = [];
  
  // Indicador de carga
  loading = false;
  
  // Control de responsive
  isMobile = false;
  
  // Paginador para móvil
  mobilePaginator = {
    pageSize: 5,
    pageIndex: 0
  };

  // ✅ Resumen de pagos
  resumen: ResumenPagos = {
    totalPorPagar: 0,
    pendientes: 0,
    vencidos: 0,
    pagados: 0
  };

  // ✅ NUEVO: Controles de filtro
  dateRangeStart = new FormControl<Date | null>(null);
  dateRangeEnd = new FormControl<Date | null>(null);
  statusFilter = new FormControl<string>('all');
  searchFilter = new FormControl<string>('');

  constructor(
    private dialog: MatDialog,
    private breakpointObserver: BreakpointObserver,
    private accountsPayableService: AccountsPayableService
  ) {}

  ngOnInit(): void {
    // Detectar tamaño de pantalla para responsive
    this.breakpointObserver.observe([
      Breakpoints.XSmall,
      Breakpoints.Small
    ]).subscribe(result => {
      this.isMobile = result.matches;
    });
    
    // ✅ NUEVO: Suscribirse a cambios en los filtros
    this.setupFilterListeners();
    
    // Obtener token de desarrollo y cargar datos
    this.initializeAuth();
  }

  /**
   * ✅ NUEVO: Configura los listeners para los filtros
   */
  private setupFilterListeners(): void {
    // Listener para rango de fechas
    this.dateRangeStart.valueChanges.subscribe(() => this.applyAllFilters());
    this.dateRangeEnd.valueChanges.subscribe(() => this.applyAllFilters());
    
    // Listener para estado
    this.statusFilter.valueChanges.subscribe(() => this.applyAllFilters());
    
    // Listener para búsqueda de texto
    this.searchFilter.valueChanges.subscribe(() => this.applyAllFilters());
  }

  /**
   * Inicializa la autenticación y carga los datos
   */
  private initializeAuth(): void {
    const idToken = localStorage.getItem('idToken');
  
    if (idToken) {
      this.loadPagos();
    } else {
      Sweetalert.fnc('error', 'No se encontró token de autenticación. Por favor, inicia sesión.', null);
    }
  }

  /**
   * Carga la lista de pagos desde el backend
   */
  loadPagos(): void {
    this.loading = true;
    
    this.accountsPayableService.getAll().pipe(
      catchError((error) => {
        this.handleError(error);
        return of([]);
      }),
      finalize(() => {
        this.loading = false;
      })
    ).subscribe((accounts) => {
      console.log('Cuentas recibidas del backend:', accounts);
      
      const pagosDisplay: PagoDisplay[] = accounts.map(account => ({
        id: account.id,
        rfcProveedor: account.providerInfo?.rfc || account.providerRfc || account.partnerId,
        razonSocial: account.providerInfo?.razonSocial || account.providerInfo?.nombre || account.providerName || `Proveedor ${account.partnerId}`,
        fecha: account.createdAt ? new Date(account.createdAt) : new Date(),
        vencimiento: account.dueDate ? new Date(account.dueDate) : new Date(),
        descripcion: account.concept || account.cfdiId || 'Cuenta por pagar',
        monto: account.totalAmount,
        estado: this.mapBackendStatusToDisplay(account.status),
        paid_amount: account.paidAmount,
        credit_days: account.creditDays,
        documentId: account.cfdiId,
        concept: account.concept,
        notes: account.notes,
        providerInfo: account.providerInfo
      }));
      
      // ✅ Guardar todos los datos originales
      this.allPagos = pagosDisplay;
      
      // ✅ Aplicar filtros
      this.applyAllFilters();
      
      if (pagosDisplay.length > 0) {
        Sweetalert.fnc('success', `${pagosDisplay.length} cuentas por pagar cargadas correctamente`, null);
      }
    });
  }

  /**
   * ✅ NUEVO: Aplica todos los filtros combinados
   */
  private applyAllFilters(): void {
    let filtered = [...this.allPagos];

    // 1. Filtro de búsqueda de texto
    const searchTerm = this.searchFilter.value?.trim().toLowerCase();
    if (searchTerm) {
      filtered = filtered.filter(pago => 
        pago.rfcProveedor.toLowerCase().includes(searchTerm) ||
        pago.razonSocial.toLowerCase().includes(searchTerm) ||
        pago.descripcion?.toLowerCase().includes(searchTerm)
      );
    }

    // 2. Filtro de rango de fechas
    const startDate = this.dateRangeStart.value;
    const endDate = this.dateRangeEnd.value;
    
    if (startDate) {
      filtered = filtered.filter(pago => 
        new Date(pago.vencimiento) >= startDate
      );
    }
    
    if (endDate) {
      // Agregar un día completo al end date
      const endOfDay = new Date(endDate);
      endOfDay.setHours(23, 59, 59, 999);
      
      filtered = filtered.filter(pago => 
        new Date(pago.vencimiento) <= endOfDay
      );
    }

    // 3. Filtro de estado
    const status = this.statusFilter.value;
    if (status && status !== 'all') {
      filtered = filtered.filter(pago => {
        switch (status) {
          case 'pending':
            return this.isEstadoPendiente(pago) && !this.isEstadoVencido(pago);
          case 'paid':
            return this.isEstadoPagado(pago);
          case 'overdue':
            return this.isEstadoVencido(pago);
          default:
            return true;
        }
      });
    }

    // Actualizar la tabla
    this.dataSource.data = filtered;
    
    // Recalcular resumen con datos filtrados
    this.calcularResumen(filtered);
    
    // Resetear paginador móvil
    this.mobilePaginator.pageIndex = 0;
  }

  /**
   * Aplica filtro a la tabla (método antiguo, ahora usa el FormControl)
   */
  applyFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value;
    this.searchFilter.setValue(filterValue);
  }

  /**
   * ✅ NUEVO: Limpia todos los filtros
   */
  clearFilters(): void {
    this.dateRangeStart.setValue(null);
    this.dateRangeEnd.setValue(null);
    this.statusFilter.setValue('all');
    this.searchFilter.setValue('');
  }

  /**
   * Maneja los errores HTTP
   */
  private handleError(error: any) {
    console.error('Error en PagosComponent:', error);
    let errorMessage = 'Error al cargar las cuentas por pagar';
    
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Error del cliente: ${error.error.message}`;
    } else {
      errorMessage = `Error del servidor: ${error.status}, mensaje: ${error.message}`;
    }
    
    Sweetalert.fnc('error', errorMessage, null);
  }

  /**
   * Extrae el RFC del proveedor desde localStorage o simula uno
   */
  private extractProviderRfc(partnerId: number | string): string {
    try {
      if (typeof partnerId === 'string' && partnerId.length >= 10) {
        return partnerId.substring(0, 13);
      }
      
      const storedData = JSON.parse(localStorage.getItem('pagos_real_data') || '{}');
      
      for (const [accountId, data] of Object.entries(storedData)) {
        if ((data as any)?.providerId === partnerId) {
          const providerRfc = (data as any)?.providerRfc;
          if (providerRfc) {
            return providerRfc.substring(0, 13);
          }
        }
      }
      
      return `PROV${String(partnerId).padStart(9, '0')}`;
      
    } catch (error) {
      console.warn('Error extrayendo RFC:', error);
      return `PROV${String(partnerId).padStart(9, '0')}`;
    }
  }

  /**
   * Extrae el nombre del proveedor desde localStorage
   */
  private extractProviderName(partnerId: number | string): string {
    try {
      const storedData = JSON.parse(localStorage.getItem('pagos_real_data') || '{}');
      
      for (const [accountId, data] of Object.entries(storedData)) {
        if ((data as any)?.providerId === partnerId) {
          return (data as any)?.providerName || `Proveedor ${partnerId}`;
        }
      }
      
      return `Proveedor ${partnerId}`;
      
    } catch (error) {
      return `Proveedor ${partnerId}`;
    }
  }

  /**
   * Extrae el concepto desde localStorage
   */
  private extractConcept(accountId: string): string {
    try {
      const storedData = JSON.parse(localStorage.getItem('pagos_real_data') || '{}');
      return storedData[accountId]?.concept || '';
    } catch (error) {
      return '';
    }
  }

  /**
   * Extrae las notas desde localStorage
   */
  private extractNotes(accountId: string): string {
    try {
      const storedData = JSON.parse(localStorage.getItem('pagos_real_data') || '{}');
      return storedData[accountId]?.notes || '';
    } catch (error) {
      return '';
    }
  }

  /**
   * Calcular resumen de pagos
   */
  private calcularResumen(pagos: PagoDisplay[]): void {
    this.resumen = {
      totalPorPagar: 0,
      pendientes: 0,
      vencidos: 0,
      pagados: 0
    };

    pagos.forEach(pago => {
      const montoRestante = pago.monto - pago.paid_amount;
      
      if (pago.estado !== 'pagado') {
        this.resumen.totalPorPagar += montoRestante;
      }

      if (pago.estado === 'pagado') {
        this.resumen.pagados += pago.monto;
      } else if (this.isEstadoVencido(pago)) {
        this.resumen.vencidos += montoRestante;
      } else if (pago.estado === 'pendiente' || pago.estado === 'parcial') {
        this.resumen.pendientes += montoRestante;
      }
    });

    console.log('Resumen pagos calculado:', this.resumen);
  }

  /**
   * Mapea el estado del backend al formato del frontend
   */
  private mapBackendStatusToDisplay(status: string): string {
    switch (status) {
      case 'pending': return 'pendiente';
      case 'partial': return 'parcial';
      case 'paid': return 'pagado';
      case 'cancelled': return 'cancelado';
      default: return 'pendiente';
    }
  }

  /**
   * Verifica si una cuenta está vencida
   */
  private isOverdue(vencimiento: Date): boolean {
    return new Date() > new Date(vencimiento);
  }

  /**
   * Abre el diálogo para agregar un nuevo pago
   */
  openPagoDialog(): void {
    const dialogRef = this.dialog.open(PagoFormModalComponent, {
      width: this.isMobile ? '95%' : '900px',
      maxWidth: '90vw',
      maxHeight: '90vh',
      data: null,
      disableClose: false
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        Sweetalert.fnc('success', 'Nueva cuenta por pagar creada exitosamente', null);
        this.loadPagos();
      }
    });
  }

  /**
   * Edita un pago existente
   */
  editPago(pago: PagoDisplay): void {
    const pagoData = {
      id: pago.id,
      providerId: pago.rfcProveedor,
      providerName: pago.razonSocial,
      documentId: pago.documentId,
      documentType: 'CFDI',
      documentNumber: '',
      documentReference: '',
      concept: pago.concept || pago.descripcion,
      totalAmount: pago.monto,
      issueDate: pago.fecha.toISOString(),
      dueDate: pago.vencimiento.toISOString(),
      creditDays: pago.credit_days,
      notes: pago.notes || ''
    };

    const dialogRef = this.dialog.open(PagoFormModalComponent, {
      width: this.isMobile ? '95%' : '900px',
      maxWidth: '90vw',
      maxHeight: '90vh',
      data: pagoData,
      disableClose: false
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        Sweetalert.fnc('success', 'Cuenta por pagar actualizada exitosamente', null);
        this.loadPagos();
      }
    });
  }

  /**
   * Elimina un pago con confirmación SweetAlert
   */
  async deletePago(event: Event, id: string): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    
    if (!id) {
      console.error('ID de pago no válido:', id);
      Sweetalert.fnc('error', 'Error: ID de pago no válido', null);
      return;
    }

    const confirmed = await Sweetalert.confirmDelete(
      '¿Estás seguro?',
      '¿Quieres eliminar esta cuenta por pagar? Esta acción no se puede deshacer.'
    );

    if (confirmed) {
      this.loading = true;
      Sweetalert.fnc('loading', 'Procesando solicitud...', null);
      
      this.accountsPayableService.delete(id)
        .pipe(finalize(() => this.loading = false))
        .subscribe({
          next: () => {
            Sweetalert.fnc('close', '', null);
            this.removeRealDataFromStorage(id);
            this.loadPagos();
            
            setTimeout(() => {
              Sweetalert.fnc('success', 'La cuenta por pagar se eliminó correctamente', null);
            }, 100);
          },
          error: (error) => {
            console.error('Error al eliminar cuenta por pagar:', error);
            Sweetalert.fnc('error', 'Error al eliminar la cuenta por pagar: ' + this.getErrorMessage(error), null);
          }
        });
    }
  }

  /**
   * Elimina los datos reales del localStorage
   */
  private removeRealDataFromStorage(accountId: string): void {
    try {
      const existingData = JSON.parse(localStorage.getItem('pagos_real_data') || '{}');
      delete existingData[accountId];
      localStorage.setItem('pagos_real_data', JSON.stringify(existingData));
    } catch (error) {
      console.error('Error removing real data from localStorage:', error);
    }
  }

  /**
   * Marca un pago como pagado con confirmación SweetAlert
   */
  async marcarPagado(pago: PagoDisplay): Promise<void> {
    const confirmed = await Sweetalert.confirmAction(
      'Confirmar pago',
      `¿Marcar como pagado el pago a ${pago.razonSocial} por $${pago.monto.toLocaleString()}?`
    );

    if (confirmed) {
      this.loading = true;
      Sweetalert.fnc('loading', 'Registrando pago...', null);

      const paymentData = {
        amount: pago.monto - pago.paid_amount,
        paymentMethod: 'transfer',
        paymentDate: new Date().toISOString().split('T')[0],
        description: 'Pago registrado desde frontend'
      };

      this.accountsPayableService.registerPayment(pago.id, paymentData)
        .pipe(finalize(() => this.loading = false))
        .subscribe({
          next: (payment) => {
            Sweetalert.fnc('close', '', null);
            this.loadPagos();
            
            setTimeout(() => {
              Sweetalert.fnc('success', 'Pago registrado exitosamente', null);
            }, 100);
          },
          error: (error) => {
            console.error('Error registering payment:', error);
            Sweetalert.fnc('error', 'Error al registrar el pago: ' + this.getErrorMessage(error), null);
          }
        });
    }
  }

  /**
   * Exporta la lista de pagos
   */
  exportPagos(format: string): void {
    if (!this.dataSource || this.dataSource.data.length === 0) {
      Sweetalert.fnc('warning', 'No hay datos para exportar', null);
      return;
    }

    const datos = this.dataSource.data.map((pago: any) => ({
      'RFC Proveedor': pago.rfcProveedor,
      'Nombre o Razón Social': pago.razonSocial,
      'Fecha': pago.fecha ? new Date(pago.fecha).toLocaleDateString() : '',
      'Vencimiento': pago.vencimiento ? new Date(pago.vencimiento).toLocaleDateString() : '',
      'Descripción': pago.descripcion || '',
      'Monto': pago.monto,
      'Estado': this.getEstadoTexto(pago)
    }));

    if (format === 'csv') {
      const csv = Papa.unparse(datos);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `pagos_${new Date().getTime()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      Sweetalert.fnc('success', 'Archivo CSV exportado exitosamente', null);
    } else if (format === 'xlsx') {
      const worksheet = XLSX.utils.json_to_sheet(datos);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Pagos');
      XLSX.writeFile(workbook, `pagos_${new Date().getTime()}.xlsx`);
      Sweetalert.fnc('success', 'Archivo Excel exportado exitosamente', null);
    }
  }

  /**
   * Extrae el mensaje de error
   */
  private getErrorMessage(error: any): string {
    if (error.error instanceof ErrorEvent) {
      return `Error: ${error.error.message}`;
    } else {
      return `Error del servidor: ${error.status}, mensaje: ${error.message}`;
    }
  }

  /**
   * Verifica si un pago está pendiente
   */
  isEstadoPendiente(pago: PagoDisplay): boolean {
    return pago.estado === 'pendiente';
  }

  /**
   * Verifica si un pago está pagado
   */
  isEstadoPagado(pago: PagoDisplay): boolean {
    return pago.estado === 'pagado';
  }

  /**
   * Verifica si un pago está vencido
   */
  isEstadoVencido(pago: PagoDisplay): boolean {
    return pago.estado === 'pendiente' && this.isOverdue(pago.vencimiento);
  }

  /**
   * Obtiene el texto del estado
   */
  getEstadoTexto(pago: PagoDisplay): string {
    if (this.isEstadoVencido(pago)) return 'Vencido';
    
    switch (pago.estado) {
      case 'pendiente': return 'Pendiente';
      case 'pagado': return 'Pagado';
      case 'parcial': return 'Parcial';
      case 'cancelado': return 'Cancelado';
      default: return '';
    }
  }

  /**
   * Métodos para paginación móvil
   */
  getMobileStartIndex(): number {
    return this.mobilePaginator.pageIndex * this.mobilePaginator.pageSize;
  }

  getMobileEndIndex(): number {
    return Math.min(
      (this.mobilePaginator.pageIndex + 1) * this.mobilePaginator.pageSize,
      this.dataSource.data.length
    );
  }

  previousMobilePage(): void {
    if (this.mobilePaginator.pageIndex > 0) {
      this.mobilePaginator.pageIndex--;
    }
  }

  nextMobilePage(): void {
    if (!this.isLastMobilePage()) {
      this.mobilePaginator.pageIndex++;
    }
  }

  isLastMobilePage(): boolean {
    const maxIndex = Math.ceil(this.dataSource.data.length / this.mobilePaginator.pageSize) - 1;
    return this.mobilePaginator.pageIndex >= maxIndex;
  }
}