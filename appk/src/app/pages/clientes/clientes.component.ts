import { Component, OnInit, HostListener } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { MatTableDataSource } from '@angular/material/table';
import { catchError, finalize } from 'rxjs/operators';
import { of } from 'rxjs';
import * as XLSX from 'xlsx';
import { ApibizService } from 'src/app/services/apibiz.service';
import { Sweetalert } from '../../functions';
import { AddClientModalComponent } from './add-client-modal/add-client-modal.component';
import { Cliente } from '../../models/cliente.model';

interface MobilePaginator {
  pageSize: number;
  pageIndex: number;
}

@Component({
    selector: 'app-clientes',
    templateUrl: './clientes.component.html',
    styleUrls: ['./clientes.component.css'],
    standalone: false
})
export class ClientesComponent implements OnInit {
  // Propiedades del componente
  clients: Cliente[] = [];
  dataSource = new MatTableDataSource<Cliente>([]);
  displayedColumns: string[] = ['razonSocial', 'rfc', 'email', 'telefono', 'actions'];
  loading: boolean = false;
  isMobile = false;
  
  // Paginador móvil
  mobilePaginator: MobilePaginator = {
    pageSize: 5,
    pageIndex: 0
  };
  
  constructor(
    private dialog: MatDialog, 
    private apibizService: ApibizService
  ) {
    this.checkScreenSize();
  }

  ngOnInit() {
    this.loadClients();
  }

  /**
   * Detecta el tamaño de la pantalla para ajustar la vista
   */
  @HostListener('window:resize')
  checkScreenSize() {
    this.isMobile = window.innerWidth < 600;
  }

  /**
   * Carga los clientes desde el servicio
   */
  loadClients() {
    this.loading = true;
    this.apibizService.getClients().pipe(
      catchError((error) => {
        this.handleError(error);
        return of([]);
      }),
      finalize(() => {
        this.loading = false;
      })
    ).subscribe((data) => {
      this.clients = data;
      this.dataSource = new MatTableDataSource<Cliente>(this.clients);
      this.dataSource.filterPredicate = this.createFilter();
      
      // Resetear el paginador móvil
      this.mobilePaginator.pageIndex = 0;
    });
  }

  /**
   * Crea una función de filtro personalizada
   */
  createFilter(): (data: Cliente, filter: string) => boolean {
    return (data: Cliente, filter: string): boolean => {
      const searchTerms = filter.toLowerCase().split(' ');
      
      // Datos a buscar
      const searchableData = [
        data.nombre,
        data.Rfc,
        data.email,
        data.Telefono
      ].map(value => value?.toLowerCase() || '');
      
      // Comprobar que todos los términos de búsqueda existen en algún campo
      return searchTerms.every(term => 
        searchableData.some(value => value.includes(term))
      );
    };
  }

  /**
   * Aplicar filtro a la tabla
   */
  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
    
    // Resetear el paginador móvil
    this.mobilePaginator.pageIndex = 0;
  }

  /**
   * Abre el diálogo para crear o editar un cliente
   */
  openClientDialog(client?: Cliente) {
    const dialogRef = this.dialog.open(AddClientModalComponent, {
      width: this.isMobile ? '95%' : '500px',
      maxWidth: this.isMobile ? '100vw' : '600px',
      data: client ? { ...client, isEditing: true } : { isEditing: false }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        if (result.ID) {
          this.updateClient(result);
        } else {
          this.createClient(result);
        }
      }
    });
  }

  /**
   * Crea un nuevo cliente
   */
  private createClient(clientData: Omit<Cliente, 'ID'>) {
    // Asegúrate de que no haya una propiedad ID
    const { ID, ...clientDataWithoutId } = clientData as any;
    
    this.loading = true;
    this.apibizService.createClient(clientDataWithoutId)
      .pipe(finalize(() => this.loading = false))
      .subscribe({
        next: (newClient) => {
          Sweetalert.fnc('success', 'Cliente creado correctamente', null);
          this.loadClients();
        },
        error: (error) => {
          console.error('Error al crear cliente:', error);
          Sweetalert.fnc('error', 'Error al crear el cliente: ' + this.getErrorMessage(error), null);
        }
      });
  }

  /**
   * Actualiza un cliente existente
   */
  private updateClient(clientData: Cliente) {
    if (!clientData.ID) {
      console.error('ID de cliente no válido');
      Sweetalert.fnc('error', 'Error: ID de cliente no válido', null);
      return;
    }
    
    this.loading = true;
    this.apibizService.updateClient(clientData.ID, clientData)
      .pipe(finalize(() => this.loading = false))
      .subscribe({
        next: (updatedClient) => {
          // Actualizar el cliente en la lista local
          const index = this.clients.findIndex(c => c.ID === updatedClient.ID);
          if (index !== -1) {
            this.clients[index] = updatedClient;
            this.dataSource.data = [...this.clients]; // Forzar detección de cambios
          }
          Sweetalert.fnc('success', 'Cliente actualizado correctamente', null);
        },
        error: (error) => {
          console.error('Error al actualizar cliente:', error);
          Sweetalert.fnc('error', 'Error al actualizar el cliente: ' + this.getErrorMessage(error), null);
        }
      });
  }

  /**
   * Abre el diálogo para editar un cliente
   */
  editClient(client: Cliente) {
    this.openClientDialog(client);
  }

  /**
   * Elimina un cliente
   */
  async deleteClient(event: Event, ID: number) {
    event.preventDefault();
    event.stopPropagation();
    
    if (ID === undefined || isNaN(ID)) {
      console.error('ID de cliente no válido:', ID);
      Sweetalert.fnc('error', 'Error: ID de cliente no válido', null);
      return;
    }

    const confirmed = await Sweetalert.confirmDelete(
      '¿Estás seguro?',
      '¿Quieres eliminar este cliente? Esta acción no se puede deshacer.'
    );

    if (confirmed) {
      this.loading = true;
      Sweetalert.fnc('loading', 'Procesando solicitud...', null);
      
      this.apibizService.deleteClient(ID)
        .pipe(finalize(() => this.loading = false))
        .subscribe({
          next: () => {
            // Cerramos el SweetAlert de carga
            Sweetalert.fnc('close', '', null);
            this.loadClients();
            
            // Mostramos el SweetAlert de éxito
            setTimeout(() => {
              Sweetalert.fnc('success', 'El cliente se eliminó correctamente', null);
            }, 100);
          },
          error: (error) => {
            console.error('Error al eliminar cliente:', error);
            Sweetalert.fnc('error', 'Error al eliminar el cliente: ' + this.getErrorMessage(error), null);
          }
        });
    }
  }

  /**
 * Exporta los clientes a un formato CSV o Excel
 * @param format Formato de exportación ('csv' o 'xlsx')
 */
exportClients(format: string = 'xlsx') {
  if (this.clients.length === 0) {
    Sweetalert.fnc('info', 'No hay datos para exportar', null);
    return;
  }

  try {
    // Crear datos para exportar
    const data = this.clients.map(client => ({
      'Nombre o Razón Social': client.nombre,
      'RFC': client.Rfc,
      'Email': client.email,
      'Teléfono': client.Telefono || ''
    }));

    // Crear el libro y hoja
    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(data);
    const workbook: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Clientes');

    // Ajustar anchos de columna
    const columnsWidths = [
      { wch: 30 }, // Nombre
      { wch: 15 }, // RFC
      { wch: 25 }, // Email
      { wch: 15 }  // Teléfono
    ];
    worksheet['!cols'] = columnsWidths;

    const fileName = `clientes_${new Date().toISOString().split('T')[0]}`;

    if (format === 'csv') {
      // Exportar como CSV
      const csvContent = XLSX.utils.sheet_to_csv(worksheet);
      this.downloadFile(csvContent, `${fileName}.csv`, 'text/csv');
    } else {
      // Exportar como Excel
      XLSX.writeFile(workbook, `${fileName}.xlsx`);
    }

    Sweetalert.fnc('success', `Exportación a ${format.toUpperCase()} completada`, null);
  } catch (error) {
    console.error('Error al exportar datos:', error);
    Sweetalert.fnc('error', 'Error al exportar los datos', null);
  }
}

/**
 * Descarga el archivo generado (para CSV)
 */
private downloadFile(content: string, fileName: string, contentType: string) {
  const blob = new Blob([content], { type: contentType });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  window.URL.revokeObjectURL(url);
}

  /**
   * Maneja los errores HTTP
   */
  private handleError(error: HttpErrorResponse) {
    console.error('Error en ClientesComponent:', error);
    let errorMessage = 'Ocurrió un error al cargar los clientes';
    
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Error del cliente: ${error.error.message}`;
    } else {
      errorMessage = `Error del servidor: ${error.status}, mensaje: ${error.message}`;
    }
    
    Sweetalert.fnc('error', errorMessage, null);
  }

  /**
   * Extrae el mensaje de error
   */
  private getErrorMessage(error: any): string {
    if (error.error instanceof ErrorEvent) {
      return `Error: ${error.error.message}`;
    } else {
      return `Error del servidor: ${error.status}, mensaje: ${error.message}, detalles: ${JSON.stringify(error.error)}`;
    }
  }
  
  // Métodos para paginación móvil
  getMobileStartIndex(): number {
    return this.mobilePaginator.pageIndex * this.mobilePaginator.pageSize;
  }

  getMobileEndIndex(): number {
    const end = (this.mobilePaginator.pageIndex + 1) * this.mobilePaginator.pageSize;
    return Math.min(end, this.dataSource.filteredData.length);
  }

  nextMobilePage(): void {
    if (!this.isLastMobilePage()) {
      this.mobilePaginator.pageIndex++;
    }
  }

  previousMobilePage(): void {
    if (this.mobilePaginator.pageIndex > 0) {
      this.mobilePaginator.pageIndex--;
    }
  }

  isLastMobilePage(): boolean {
    const maxPageIndex = Math.ceil(this.dataSource.filteredData.length / this.mobilePaginator.pageSize) - 1;
    return this.mobilePaginator.pageIndex >= maxPageIndex;
  }
}