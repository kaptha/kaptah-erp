import { Component, OnInit, HostListener } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { MatTableDataSource } from '@angular/material/table';
import { catchError, finalize } from 'rxjs/operators';
import { of } from 'rxjs';
import * as XLSX from 'xlsx';
import { ApibizService } from 'src/app/services/apibiz.service';
import { Sweetalert } from '../../functions';
import { ModalProvComponent } from './modal-prov/modal-prov.component';
import { Proveedor } from '../../models/proveedor.model';

interface MobilePaginator {
  pageSize: number;
  pageIndex: number;
}

@Component({
    selector: 'app-proveedores',
    templateUrl: './proveedores.component.html',
    styleUrls: ['./proveedores.component.css'],
    standalone: false
})
export class ProveedoresComponent implements OnInit {
  // Propiedades del componente
  proveedores: Proveedor[] = [];
  dataSource = new MatTableDataSource<Proveedor>([]);
  displayedColumns: string[] = [
    'razon_social',
    'rfc',
    'email',
    'telefono',
    'Cpostal',
    'colonia',
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
    this.loadProveedores();
  }

  /**
   * Detecta el tamaño de la pantalla para ajustar la vista
   */
  @HostListener('window:resize')
  checkScreenSize() {
    this.isMobile = window.innerWidth < 600;
  }

  /**
   * Carga los proveedores desde el servicio
   */
  loadProveedores() {
    this.loading = true;
    this.apibizService.getProveedores().pipe(
      catchError((error) => {
        this.handleError(error);
        return of([]);
      }),
      finalize(() => {
        this.loading = false;
      })
    ).subscribe((data) => {
      this.proveedores = data;
      this.dataSource = new MatTableDataSource<Proveedor>(this.proveedores);
      this.dataSource.filterPredicate = this.createFilter();
      
      // Resetear el paginador móvil
      this.mobilePaginator.pageIndex = 0;
    });
  }

  /**
   * Crea una función de filtro personalizada
   */
  createFilter(): (data: Proveedor, filter: string) => boolean {
    return (data: Proveedor, filter: string): boolean => {
      const searchTerms = filter.toLowerCase().split(' ');
      
      // Datos a buscar
      const searchableData = [
        data.razon_social,
        data.rfc,
        data.email,
        data.telefono,
        data.Cpostal,
        data.colonia
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
   * Abre el diálogo para crear o editar un proveedor
   */
  agregarProveedor(proveedor?: Proveedor) {
    const dialogRef = this.dialog.open(ModalProvComponent, {
      width: this.isMobile ? '95%' : '800px',
      maxWidth: this.isMobile ? '100vw' : '800px',
      data: {
        proveedor: proveedor || null,
        titulo: proveedor ? 'Editar Proveedor' : 'Agregar Proveedor'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        if (result.ID) {
          this.updateProveedor(result);
        } else {
          this.createProveedor(result);
        }
      }
    });
  }

  /**
   * Crea un nuevo proveedor
   */
  private createProveedor(proveedorData: Omit<Proveedor, 'ID'>) {
    // Limpiar campos que no deben enviarse al backend
    const { 
      ID, 
      userId, 
      fecha_registro, 
      Fecha_Registro,
      activo, 
      isEditing,
      estado_proveedor,
      pais,
      ...cleanData 
    } = proveedorData as any;
    
    // Convertir campos numéricos que pueden venir como string
    const dataToSend = {
      ...cleanData,
      limite_credito: cleanData.limite_credito ? Number(cleanData.limite_credito) : 0,
      dias_credito: cleanData.dias_credito ? Number(cleanData.dias_credito) : 0
    };
    
    this.loading = true;
    this.apibizService.createProveedor(dataToSend)
      .pipe(
        catchError((error) => {
          console.error('Error al crear proveedor:', error);
          Sweetalert.fnc('error', 'Error al crear el proveedor: ' + this.getErrorMessage(error), null);
          return of(null); // Retornar observable vacío para evitar que se rompa el flujo
        }),
        finalize(() => this.loading = false)
      )
      .subscribe({
        next: (newProveedor) => {
          if (newProveedor) {
            Sweetalert.fnc('success', 'Proveedor creado correctamente', null);
            this.loadProveedores();
          }
        }
      });
  }

  /**
   * Actualiza un proveedor existente
   */
  private updateProveedor(proveedorData: Proveedor) {
    if (!proveedorData.ID) {
      console.error('ID de proveedor no válido');
      Sweetalert.fnc('error', 'Error: ID de proveedor no válido', null);
      return;
    }
    
    // Excluir campos que no deben enviarse al backend
    const { 
      ID, 
      userId, 
      fecha_registro, 
      Fecha_Registro,
      activo, 
      isEditing,
      estado_proveedor,
      pais,
      ...updateData 
    } = proveedorData as any;
    
    // Convertir campos numéricos que pueden venir como string
    const dataToSend = {
      ...updateData,
      limite_credito: updateData.limite_credito ? Number(updateData.limite_credito) : 0,
      dias_credito: updateData.dias_credito ? Number(updateData.dias_credito) : 0
    };
    
    this.loading = true;
    this.apibizService.updateProveedor(ID, dataToSend)
      .pipe(
        catchError((error) => {
          console.error('Error al actualizar proveedor:', error);
          Sweetalert.fnc('error', 'Error al actualizar el proveedor: ' + this.getErrorMessage(error), null);
          return of(null);
        }),
        finalize(() => this.loading = false)
      )
      .subscribe({
        next: (updatedProveedor) => {
          if (updatedProveedor) {
            // Actualizar el proveedor en la lista local
            const index = this.proveedores.findIndex(p => p.ID === updatedProveedor.ID);
            if (index !== -1) {
              this.proveedores[index] = updatedProveedor;
              this.dataSource.data = [...this.proveedores]; // Forzar detección de cambios
            }
            Sweetalert.fnc('success', 'Proveedor actualizado correctamente', null);
          }
        }
      });
  }

  /**
   * Edita un proveedor existente
   */
  editProveedor(proveedor: Proveedor) {
    this.agregarProveedor(proveedor);
  }

  /**
   * Elimina un proveedor
   */
  async deleteProveedor(event: Event, ID: number | undefined) {
  event.preventDefault();
  event.stopPropagation();
  
  if (ID === undefined || isNaN(Number(ID))) {
    console.error('ID de proveedor no válido:', ID);
    Sweetalert.fnc('error', 'Error: ID de proveedor no válido', null);
    return;
  }

  const proveedorId = Number(ID); // Convierte a número explícitamente
  
  const confirmed = await Sweetalert.confirmDelete(
    '¿Estás seguro?',
    '¿Quieres eliminar este proveedor? Esta acción no se puede deshacer.'
  );

  if (confirmed) {
    this.loading = true;
    Sweetalert.fnc('loading', 'Procesando solicitud...', null);
    
    this.apibizService.deleteProveedor(proveedorId)
      .pipe(finalize(() => this.loading = false))
      .subscribe({
        next: () => {
          Sweetalert.fnc('close', '', null);
          this.loadProveedores();
          setTimeout(() => {
            Sweetalert.fnc('success', 'El proveedor se eliminó correctamente', null);
          }, 100);
        },
        error: (error) => {
          console.error('Error al eliminar proveedor:', error);
          Sweetalert.fnc('error', 'Error al eliminar el proveedor: ' + this.getErrorMessage(error), null);
        }
      });
  }
}

  /**
 * Exporta los proveedores a formato CSV o Excel
 * @param format Formato de exportación ('csv' o 'xlsx')
 */
exportar(format: string = 'xlsx') {
  if (this.proveedores.length === 0) {
    Sweetalert.fnc('info', 'No hay datos para exportar', null);
    return;
  }

  try {
    // Crear datos para exportar
    const data = this.proveedores.map(proveedor => ({
      'Nombre': proveedor.nombre || '',
      'Razón Social': proveedor.razon_social,
      'RFC': proveedor.rfc,
      'Email': proveedor.email || '',
      'Teléfono': proveedor.telefono || '',
      'Régimen Fiscal': proveedor.regimen_fiscal || '',
      'Tipo de Contribuyente': proveedor.tipo_contribuyente || '',
      'Dirección': `${proveedor.calle || ''} ${proveedor.numero_ext || ''} ${proveedor.numero_int ? 'Int. ' + proveedor.numero_int : ''}`,
      'Colonia': proveedor.colonia || '',
      'Código Postal': proveedor.Cpostal || '',
      'Municipio': proveedor.municipio || '',
      'Estado/Provincia': proveedor.estado || '',  // Cambié el nombre para diferenciar
      'País': proveedor.pais || '',
      'Banco': proveedor.banco || '',
      'Cuenta Bancaria': proveedor.cuenta_bancaria || '',
      'Tipo de Cuenta': proveedor.tipo_cuenta || '',
      'CLABE': proveedor.clabe || '',
      'Beneficiario': proveedor.beneficiario || '',
      'Límite de Crédito': proveedor.limite_credito || 0,
      'Días de Crédito': proveedor.dias_credito || 0,
      'Estado del Proveedor': proveedor.estado_proveedor || '',  // Cambié el nombre para evitar la duplicidad
      'Categoría': proveedor.categoria || '',
      'Notas': proveedor.notas || '',
      'Fecha de Registro': proveedor.fecha_registro ? new Date(proveedor.fecha_registro).toLocaleDateString() : '',
      'Activo': proveedor.activo ? 'Sí' : 'No'
    }));

    // Crear el libro y hoja
    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(data);
    const workbook: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Proveedores');

    // Ajustar anchos de columna
    const columnsWidths = [
      { wch: 25 }, // Nombre
      { wch: 30 }, // Razón Social
      { wch: 15 }, // RFC
      { wch: 25 }, // Email
      { wch: 15 }, // Teléfono
      { wch: 20 }, // Régimen Fiscal
      { wch: 20 }, // Tipo de Contribuyente
      { wch: 40 }, // Dirección
      { wch: 25 }, // Colonia
      { wch: 15 }, // Código Postal
      { wch: 20 }, // Municipio
      { wch: 20 }, // Estado
      { wch: 15 }, // País
      { wch: 20 }, // Banco
      { wch: 20 }, // Cuenta Bancaria
      { wch: 15 }, // Tipo de Cuenta
      { wch: 20 }, // CLABE
      { wch: 25 }, // Beneficiario
      { wch: 15 }, // Límite de Crédito
      { wch: 15 }, // Días de Crédito
      { wch: 15 }, // Estado
      { wch: 20 }, // Categoría
      { wch: 30 }, // Notas
      { wch: 20 }, // Fecha de Registro
      { wch: 10 }  // Activo
    ];
    worksheet['!cols'] = columnsWidths;

    const fileName = `proveedores_${new Date().toISOString().split('T')[0]}`;

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
    console.error('Error en ProveedoresComponent:', error);
    let errorMessage = 'Ocurrió un error al cargar los proveedores';
    
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