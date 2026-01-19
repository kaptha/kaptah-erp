import { Component, OnInit, HostListener } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { MatTableDataSource } from '@angular/material/table';
import { catchError, finalize } from 'rxjs/operators';
import { of } from 'rxjs';
import * as XLSX from 'xlsx';
import { ApibizService } from 'src/app/services/apibiz.service';
import { Sweetalert } from '../../functions';
import { EmpleadoFormComponent } from './empleado-form/empleado-form.component';
import { Empleado } from '../../models/empleado.model';

interface MobilePaginator {
  pageSize: number;
  pageIndex: number;
}

@Component({
    selector: 'app-empleados',
    templateUrl: './empleados.component.html',
    styleUrls: ['./empleados.component.css'],
    standalone: false
})
export class EmpleadosComponent implements OnInit {
  // Propiedades del componente
  empleados: Empleado[] = [];
  dataSource = new MatTableDataSource<Empleado>([]);
  displayedColumns: string[] = [
    'nombre', 
    'rfc', 
    'email', 
    'telefono', 
    'puesto',
    'departamento',
    'estado',
    'actions'
  ];
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
    this.loadEmpleados();
  }

  /**
   * Detecta el tamaño de la pantalla para ajustar la vista
   */
  @HostListener('window:resize')
  checkScreenSize() {
    this.isMobile = window.innerWidth < 600;
  }

  /**
   * Carga los empleados desde el servicio
   */
  loadEmpleados() {
    this.loading = true;
    this.apibizService.getEmpleados().pipe(
      catchError((error) => {
        this.handleError(error);
        return of([]);
      }),
      finalize(() => {
        this.loading = false;
      })
    ).subscribe((data) => {
      this.empleados = data;
      this.dataSource = new MatTableDataSource<Empleado>(this.empleados);
      this.dataSource.filterPredicate = this.createFilter();
      
      // Resetear el paginador móvil
      this.mobilePaginator.pageIndex = 0;
    });
  }

  /**
   * Crea una función de filtro personalizada
   */
  createFilter(): (data: Empleado, filter: string) => boolean {
    return (data: Empleado, filter: string): boolean => {
      const searchTerms = filter.toLowerCase().split(' ');
      
      // Datos a buscar
      const searchableData = [
        data.nombre,
        data.rfc,
        data.email,
        data.telefono,
        data.puesto,
        data.departamento,
        data.estado
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
   * Abre el diálogo para crear o editar un empleado
   */
  openEmployeeDialog(empleado?: Empleado) {
    const dialogRef = this.dialog.open(EmpleadoFormComponent, {
      width: this.isMobile ? '95%' : '800px',
      maxWidth: this.isMobile ? '100vw' : '800px',
      data: {
        empleado: empleado || null,
        mode: empleado ? 'edit' : 'create'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        if (result.mode === 'create') {
          const { id, ...empleadoData } = result.empleado; // Removemos el id si existe
          this.createEmployee(empleadoData);
        } else {
          this.updateEmployee(result.empleado);
        }
      }
    });
  }

  /**
   * Crea un nuevo empleado
   */
  private createEmployee(empleadoData: Omit<Empleado, 'id'>) {
    // Eliminar cualquier id que pueda venir en los datos
    const { id, ...empleadoDataWithoutId } = empleadoData as any;
    
    this.loading = true;
    this.apibizService.createEmpleado(empleadoDataWithoutId)
      .pipe(finalize(() => this.loading = false))
      .subscribe({
        next: (newEmpleado) => {
          Sweetalert.fnc('success', 'Empleado creado correctamente', null);
          this.loadEmpleados();
        },
        error: (error) => {
          console.error('Error al crear empleado:', error);
          Sweetalert.fnc('error', 'Error al crear el empleado: ' + this.getErrorMessage(error), null);
        }
      });
  }

  /**
   * Actualiza un empleado existente
   */
  private updateEmployee(empleadoData: Empleado) {
    if (!empleadoData.id) {
      console.error('ID de empleado no válido');
      Sweetalert.fnc('error', 'Error: ID de empleado no válido', null);
      return;
    }
    
    this.loading = true;
    this.apibizService.updateEmpleado(empleadoData.id, empleadoData)
      .pipe(finalize(() => this.loading = false))
      .subscribe({
        next: (updatedEmpleado) => {
          Sweetalert.fnc('success', 'Empleado actualizado correctamente', null);
          this.loadEmpleados();
        },
        error: (error) => {
          console.error('Error al actualizar empleado:', error);
          Sweetalert.fnc('error', 'Error al actualizar el empleado: ' + this.getErrorMessage(error), null);
        }
      });
  }

  /**
   * Edita un empleado existente
   */
  editEmployee(empleado: Empleado) {
    this.openEmployeeDialog(empleado);
  }

  /**
   * Elimina un empleado
   */
  async deleteEmployee(event: Event, id: number) {
    event.preventDefault();
    event.stopPropagation();
    
    if (id === undefined || isNaN(id)) {
      console.error('ID de empleado no válido:', id);
      Sweetalert.fnc('error', 'Error: ID de empleado no válido', null);
      return;
    }

    const confirmed = await Sweetalert.confirmDelete(
      '¿Estás seguro?',
      '¿Quieres eliminar este empleado? Esta acción no se puede deshacer.'
    );

    if (confirmed) {
      this.loading = true;
      Sweetalert.fnc('loading', 'Procesando solicitud...', null);
      
      this.apibizService.deleteEmpleado(id)
        .pipe(finalize(() => this.loading = false))
        .subscribe({
          next: () => {
            // Cerramos el SweetAlert de carga
            Sweetalert.fnc('close', '', null);
            this.loadEmpleados();
            
            // Mostramos el SweetAlert de éxito
            setTimeout(() => {
              Sweetalert.fnc('success', 'El empleado se eliminó correctamente', null);
            }, 100);
          },
          error: (error) => {
            console.error('Error al eliminar empleado:', error);
            Sweetalert.fnc('error', 'Error al eliminar el empleado: ' + this.getErrorMessage(error), null);
          }
        });
    }
  }

  /**
 * Exporta los empleados a formato CSV o Excel
 * @param format Formato de exportación ('csv' o 'xlsx')
 */
exportar(format: string = 'xlsx') {
  if (this.empleados.length === 0) {
    Sweetalert.fnc('info', 'No hay datos para exportar', null);
    return;
  }

  try {
    // Crear datos para exportar
    const data = this.empleados.map(empleado => ({
      'Nombre': empleado.nombre,
      'RFC': empleado.rfc,
      'CURP': empleado.curp || '',
      'Email': empleado.email || '',
      'Teléfono': empleado.telefono || '',
      'Fecha de Inicio': empleado.fechaInicio ? new Date(empleado.fechaInicio).toLocaleDateString() : '',
      'Puesto': empleado.puesto || '',
      'Departamento': empleado.departamento || '',
      'Salario Base': empleado.salarioBase || 0,
      'Estado': empleado.estado || ''
    }));

    // Crear el libro y hoja
    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(data);
    const workbook: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Empleados');

    // Ajustar anchos de columna
    const columnsWidths = [
      { wch: 30 }, // Nombre
      { wch: 15 }, // RFC
      { wch: 20 }, // CURP
      { wch: 25 }, // Email
      { wch: 15 }, // Teléfono
      { wch: 15 }, // Fecha de Inicio
      { wch: 20 }, // Puesto
      { wch: 20 }, // Departamento
      { wch: 15 }, // Salario Base
      { wch: 15 }  // Estado
    ];
    worksheet['!cols'] = columnsWidths;

    const fileName = `empleados_${new Date().toISOString().split('T')[0]}`;

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
    console.error('Error en EmpleadosComponent:', error);
    let errorMessage = 'Ocurrió un error al cargar los empleados';
    
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
