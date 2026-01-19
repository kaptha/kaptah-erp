import { Component, OnInit, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { FormControl } from '@angular/forms'; // ✅ NUEVO
import { finalize, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { AccountsReceivableService, AccountReceivable } from '../../services/accounts-receivable.service';
import { CobroFormModalComponent } from './cobro-form-modal/cobro-form-modal.component';
import { SendReminderDialogComponent } from './send-reminder-dialog/send-reminder-dialog.component';
import { Sweetalert } from '../../functions'; 
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import * as Papa from 'papaparse';


interface CobroDisplay {
  id: string;
  rfcCliente: string;
  razonSocial: string;
  fecha: Date;
  vencimiento: Date;
  descripcion: string;
  monto: number;
  estado: string;
  // Campos adicionales del backend
  paid_amount: number;
  credit_days: number;
  documentId?: string;
  clientInfo?: any; // ✅ AGREGADO
}

interface ResumenCobros {
  totalPorCobrar: number;
  pendientes: number;
  vencidos: number;
  cobrados: number;
}

@Component({
    selector: 'app-cobros',
    templateUrl: './cobros.component.html',
    styleUrls: ['./cobros.component.css'],
    standalone: false
})
export class CobrosComponent implements OnInit {
  // Columnas de la tabla
  displayedColumns: string[] = ['rfcCliente', 'razonSocial', 'fecha', 'vencimiento', 'descripcion', 'monto', 'actions'];
  
  // Fuente de datos para la tabla
  dataSource = new MatTableDataSource<CobroDisplay>([]);
  
  // ✅ NUEVO: Datos originales sin filtrar
  private allCobros: CobroDisplay[] = [];
  
  // Indicador de carga
  loading = false;
  
  // Control de responsive
  isMobile = false;
  
  // Paginador para móvil
  mobilePaginator = {
    pageSize: 5,
    pageIndex: 0
  };

  // ✅ Resumen de cobros
  resumen: ResumenCobros = {
    totalPorCobrar: 0,
    pendientes: 0,
    vencidos: 0,
    cobrados: 0
  };

  // ✅ NUEVO: Controles de filtro
  dateRangeStart = new FormControl<Date | null>(null);
  dateRangeEnd = new FormControl<Date | null>(null);
  statusFilter = new FormControl<string>('all');
  searchFilter = new FormControl<string>('');

  private uuidToDataMap: Map<string, any> = new Map();

  constructor(
    private dialog: MatDialog,
    private breakpointObserver: BreakpointObserver,
    private accountsReceivableService: AccountsReceivableService,
    private snackBar: MatSnackBar,
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
    
    // Cargar cobros directamente (el servicio maneja la autenticación)
    this.loadCobros();
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
   * Carga la lista de cobros desde el backend
   */
  loadCobros(): void {
    this.loading = true;
    
    this.accountsReceivableService.getAll().pipe(
      catchError((error) => {
        this.handleError(error);
        return of([]);
      }),
      finalize(() => {
        this.loading = false;
      })
    ).subscribe((accounts) => {
      console.log('Cuentas por cobrar recibidas:', accounts);
      
      const cobrosDisplay: CobroDisplay[] = accounts.map(account => ({
        id: account.id,
        rfcCliente: account.clientInfo?.rfc || account.partnerId,
        razonSocial: account.clientInfo?.razonSocial || account.clientInfo?.nombre || `Cliente ${account.partnerId}`,
        fecha: new Date(account.createdAt),
        vencimiento: new Date(account.dueDate),
        descripcion: account.cfdiId || account.concept || 'Cuenta por cobrar',
        monto: account.totalAmount,
        estado: this.mapBackendStatusToDisplay(account.status),
        paid_amount: account.paidAmount,
        credit_days: account.creditDays,
        documentId: account.cfdiId,
        clientInfo: account.clientInfo
      }));
      
      // ✅ Guardar todos los datos originales
      this.allCobros = cobrosDisplay;
      
      // ✅ Aplicar filtros
      this.applyAllFilters();
      
      // Mostrar mensaje de éxito solo si hay datos
      if (cobrosDisplay.length > 0) {
        Sweetalert.fnc('success', `${cobrosDisplay.length} cuentas por cobrar cargadas correctamente`, null);
      }
    });
  }

  /**
   * ✅ NUEVO: Aplica todos los filtros combinados
   */
  private applyAllFilters(): void {
    let filtered = [...this.allCobros];

    // 1. Filtro de búsqueda de texto
    const searchTerm = this.searchFilter.value?.trim().toLowerCase();
    if (searchTerm) {
      filtered = filtered.filter(cobro => 
        cobro.rfcCliente.toLowerCase().includes(searchTerm) ||
        cobro.razonSocial.toLowerCase().includes(searchTerm) ||
        cobro.descripcion?.toLowerCase().includes(searchTerm)
      );
    }

    // 2. Filtro de rango de fechas
    const startDate = this.dateRangeStart.value;
    const endDate = this.dateRangeEnd.value;
    
    if (startDate) {
      filtered = filtered.filter(cobro => 
        new Date(cobro.vencimiento) >= startDate
      );
    }
    
    if (endDate) {
      // Agregar un día completo al end date
      const endOfDay = new Date(endDate);
      endOfDay.setHours(23, 59, 59, 999);
      
      filtered = filtered.filter(cobro => 
        new Date(cobro.vencimiento) <= endOfDay
      );
    }

    // 3. Filtro de estado
    const status = this.statusFilter.value;
    if (status && status !== 'all') {
      filtered = filtered.filter(cobro => {
        switch (status) {
          case 'pending':
            return this.isEstadoPendiente(cobro) && !this.isEstadoVencido(cobro);
          case 'paid':
            return this.isEstadoPagado(cobro);
          case 'overdue':
            return this.isEstadoVencido(cobro);
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
   * ✅ NUEVO: Método para actualizar el rango de fechas desde el template
   */
  onDateRangeChange(start: Date | null, end: Date | null): void {
    this.dateRangeStart.setValue(start);
    this.dateRangeEnd.setValue(end);
  }

  /**
   * Maneja los errores HTTP
   */
  private handleError(error: any) {
    console.error('Error en CobrosComponent:', error);
    let errorMessage = 'Error al cargar las cuentas por cobrar';
    
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Error del cliente: ${error.error.message}`;
    } else {
      errorMessage = `Error del servidor: ${error.status}, mensaje: ${error.message}`;
    }
    
    Sweetalert.fnc('error', errorMessage, null);
  }

  /**
   * Extrae el nombre del cliente desde localStorage o usa el RFC
   */
  private extractCustomerName(rfc: string): string {
    try {
      const storedData = JSON.parse(localStorage.getItem('cobros_real_data') || '{}');
      
      for (const [accountId, data] of Object.entries(storedData)) {
        if ((data as any)?.customerRfc === rfc) {
          return (data as any).customerName || `Cliente ${rfc}`;
        }
      }
      
      return `Cliente ${rfc}`;
    } catch (error) {
      return `Cliente ${rfc}`;
    }
  }

  /**
   * Calcular resumen de cobros
   */
  private calcularResumen(cobros: CobroDisplay[]): void {
    this.resumen = {
      totalPorCobrar: 0,
      pendientes: 0,
      vencidos: 0,
      cobrados: 0
    };

    cobros.forEach(cobro => {
      const montoRestante = cobro.monto - cobro.paid_amount;
      
      if (cobro.estado !== 'pagado') {
        this.resumen.totalPorCobrar += montoRestante;
      }

      if (cobro.estado === 'pagado') {
        this.resumen.cobrados += cobro.monto;
      } else if (this.isEstadoVencido(cobro)) {
        this.resumen.vencidos += montoRestante;
      } else if (cobro.estado === 'pendiente' || cobro.estado === 'parcial') {
        this.resumen.pendientes += montoRestante;
      }
    });

    console.log('Resumen cobros calculado:', this.resumen);
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

  private getRealDataFromStorage(accountId: string): any {
    try {
      const storedData = JSON.parse(localStorage.getItem('cobros_real_data') || '{}');
      return storedData[accountId] || null;
    } catch (error) {
      console.error('Error reading real data from localStorage:', error);
      return null;
    }
  }

  /**
   * Abre el diálogo para agregar un nuevo cobro
   */
  openCobroDialog(): void {
    const dialogRef = this.dialog.open(CobroFormModalComponent, {
      width: this.isMobile ? '95%' : '800px',
      maxWidth: '90vw',
      maxHeight: '90vh',
      data: null,
      disableClose: false
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loading = true;
        this.accountsReceivableService.create(result).pipe(
          finalize(() => this.loading = false)
        ).subscribe({
          next: (account) => {
            Sweetalert.fnc('success', 'Cuenta por cobrar creada exitosamente', null);
            this.loadCobros();
          },
          error: (error) => {
            console.error('Error creating account:', error);
            Sweetalert.fnc('error', 'Error al crear la cuenta por cobrar: ' + this.getErrorMessage(error), null);
          }
        });
      }
    });
  }

  /**
   * Edita un cobro existente
   */
  editCobro(cobro: CobroDisplay): void {
    const dialogRef = this.dialog.open(CobroFormModalComponent, {
      width: this.isMobile ? '95%' : '800px',
      maxWidth: '90vw',
      maxHeight: '90vh',
      data: {
        id: cobro.id,
        customerName: cobro.razonSocial,
        customerRfc: cobro.rfcCliente,
        customerId: cobro.clientInfo?.id,
        documentType: 'nota_venta',
        documentId: cobro.documentId,
        concept: cobro.descripcion,
        totalAmount: cobro.monto,
        creditDays: cobro.credit_days,
        dueDate: cobro.vencimiento,
        notes: ''
      },
      disableClose: false
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loading = true;
        this.accountsReceivableService.update(cobro.id, result).pipe(
          finalize(() => this.loading = false)
        ).subscribe({
          next: (account) => {
            Sweetalert.fnc('success', 'Cuenta por cobrar actualizada exitosamente', null);
            this.loadCobros();
          },
          error: (error) => {
            console.error('Error updating account:', error);
            Sweetalert.fnc('error', 'Error al actualizar la cuenta por cobrar: ' + this.getErrorMessage(error), null);
          }
        });
      }
    });
  }

  /**
   * Elimina un cobro con confirmación SweetAlert
   */
  async deleteCobro(event: Event, cobroId: string): Promise<void> {
    event.stopPropagation();
    
    const confirmed = await Sweetalert.confirmAction(
      '¿Eliminar este cobro?',
      'Esta acción no se puede deshacer'
    );

    if (confirmed) {
      this.loading = true;
      Sweetalert.fnc('loading', 'Eliminando cobro...', null);

      this.accountsReceivableService.delete(cobroId)
        .pipe(finalize(() => this.loading = false))
        .subscribe({
          next: () => {
            Sweetalert.fnc('close', '', null);
            this.removeRealDataFromStorage(cobroId);
            this.loadCobros();
            
            setTimeout(() => {
              Sweetalert.fnc('success', 'Cobro eliminado exitosamente', null);
            }, 100);
          },
          error: (error) => {
            console.error('Error deleting cobro:', error);
            Sweetalert.fnc('error', 'Error al eliminar el cobro: ' + this.getErrorMessage(error), null);
          }
        });
    }
  }

  private removeRealDataFromStorage(accountId: string): void {
    try {
      const existingData = JSON.parse(localStorage.getItem('cobros_real_data') || '{}');
      delete existingData[accountId];
      localStorage.setItem('cobros_real_data', JSON.stringify(existingData));
    } catch (error) {
      console.error('Error removing real data from localStorage:', error);
    }
  }

  /**
   * Marca un cobro como pagado con confirmación SweetAlert
   */
  async marcarPagado(cobro: CobroDisplay): Promise<void> {
    const confirmed = await Sweetalert.confirmAction(
      'Confirmar pago',
      `¿Marcar como pagado el cobro de ${cobro.razonSocial} por $${cobro.monto.toLocaleString()}?`
    );

    if (confirmed) {
      this.loading = true;
      Sweetalert.fnc('loading', 'Registrando pago...', null);

      const paymentData = {
        amount: cobro.monto - cobro.paid_amount,
        paymentMethod: 'transfer',
        paymentDate: new Date().toISOString().split('T')[0],
        description: 'Pago registrado desde frontend'
      };

      this.accountsReceivableService.registerPayment(cobro.id, paymentData)
        .pipe(finalize(() => this.loading = false))
        .subscribe({
          next: (payment) => {
            Sweetalert.fnc('close', '', null);
            this.loadCobros();
            
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
   * Exporta la lista de cobros a Excel con confirmación
   */
  exportCobros(format: string): void {
    if (!this.dataSource || this.dataSource.data.length === 0) {
      Sweetalert.fnc('warning', 'No hay datos para exportar', null);
      return;
    }

    const datos = this.dataSource.data.map((cobro: any) => ({
      'RFC Cliente': cobro.rfcCliente,
      'Nombre o Razón Social': cobro.razonSocial,
      'Fecha': cobro.fecha ? new Date(cobro.fecha).toLocaleDateString() : '',
      'Vencimiento': cobro.vencimiento ? new Date(cobro.vencimiento).toLocaleDateString() : '',
      'Descripción': cobro.descripcion || '',
      'Monto': cobro.monto,
      'Estado': this.getEstadoTexto(cobro)
    }));

    if (format === 'csv') {
      const csv = Papa.unparse(datos);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `cobros_${new Date().getTime()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      Sweetalert.fnc('success', 'Archivo CSV exportado exitosamente', null);
    } else if (format === 'xlsx') {
      const worksheet = XLSX.utils.json_to_sheet(datos);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Cobros');
      XLSX.writeFile(workbook, `cobros_${new Date().getTime()}.xlsx`);
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
   * Verifica si un cobro está pendiente
   */
  isEstadoPendiente(cobro: CobroDisplay): boolean {
    return cobro.estado === 'pendiente';
  }

  /**
   * Verifica si un cobro está pagado
   */
  isEstadoPagado(cobro: CobroDisplay): boolean {
    return cobro.estado === 'pagado';
  }

  /**
   * Verifica si un cobro está vencido
   */
  isEstadoVencido(cobro: CobroDisplay): boolean {
    return cobro.estado === 'pendiente' && this.isOverdue(cobro.vencimiento);
  }

  /**
   * Obtiene el texto del estado
   */
  getEstadoTexto(cobro: CobroDisplay): string {
    if (this.isEstadoVencido(cobro)) return 'Vencido';
    
    switch (cobro.estado) {
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

  /**
   * Enviar recordatorio de pago individual
   */
  enviarRecordatorio(cobro: any): void {
    const dueAmount = cobro.monto - cobro.paid_amount;

    const dialogRef = this.dialog.open(SendReminderDialogComponent, {
      width: '500px',
      data: {
        accountId: cobro.id,
        customerName: cobro.clientInfo?.nombre || cobro.razonSocial,
        dueAmount: dueAmount,
        dueDate: cobro.vencimiento,
        defaultEmail: cobro.clientInfo?.email || ''
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        const loadingSnack = this.snackBar.open('Enviando recordatorio...', '', {
          duration: 0
        });

        this.accountsReceivableService.sendPaymentReminder(cobro.id, result).subscribe({
          next: (response) => {
            loadingSnack.dismiss();
            
            Swal.fire({
              icon: 'success',
              title: '¡Recordatorio Enviado!',
              text: response.message || 'El recordatorio de pago se envió exitosamente',
              confirmButtonColor: '#7F3FF0',
            });
          },
          error: (error) => {
            loadingSnack.dismiss();
            console.error('Error enviando recordatorio:', error);
            
            Swal.fire({
              icon: 'error',
              title: 'Error al Enviar',
              text: error.error?.message || 'No se pudo enviar el recordatorio',
              confirmButtonColor: '#7F3FF0',
            });
          }
        });
      }
    });
  }

  /**
   * Enviar recordatorios masivos a todas las cuentas vencidas
   */
  enviarRecordatoriosMasivos(): void {
    Swal.fire({
      title: '¿Enviar recordatorios masivos?',
      text: 'Se enviarán recordatorios a todas las cuentas vencidas que tengan email',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#7F3FF0',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, enviar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        const loadingSnack = this.snackBar.open('Enviando recordatorios...', '', {
          duration: 0
        });

        this.accountsReceivableService.sendOverdueReminders().subscribe({
          next: (response) => {
            loadingSnack.dismiss();
            
            Swal.fire({
              icon: 'success',
              title: '¡Recordatorios Enviados!',
              html: `
                <p><strong>Enviados:</strong> ${response.sent}</p>
                <p><strong>Fallidos:</strong> ${response.failed}</p>
              `,
              confirmButtonColor: '#7F3FF0',
            });
          },
          error: (error) => {
            loadingSnack.dismiss();
            
            Swal.fire({
              icon: 'error',
              title: 'Error al Enviar',
              text: error.error?.message || 'No se pudieron enviar los recordatorios',
              confirmButtonColor: '#7F3FF0',
            });
          }
        });
      }
    });
  }
}