import { Component, OnInit, HostListener } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatTableDataSource } from '@angular/material/table';
import { MatSnackBar } from '@angular/material/snack-bar';
import { forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';
import * as XLSX from 'xlsx';
import { ModalServComponent } from './modal-serv/modal-serv.component';
import { ServiceService } from '../../services/inventory/service.service';
import { CategoryService } from '../../services/inventory/category.service';

interface MobilePaginator {
  pageSize: number;
  pageIndex: number;
}

@Component({
    selector: 'app-servicios',
    templateUrl: './servicios.component.html',
    styleUrls: ['./servicios.component.css'],
    standalone: false
})
export class ServiciosComponent implements OnInit {
  displayedColumns: string[] = ['categoria', 'codServicios', 'servicio', 'descripcion', 'acciones'];
  dataSource = new MatTableDataSource<any>([]);
  loading = false;
  categorias: any[] = [];
  isMobile = false;
  
  // Paginador móvil
  mobilePaginator: MobilePaginator = {
    pageSize: 5,
    pageIndex: 0
  };

  constructor(
    public dialog: MatDialog,
    private serviceService: ServiceService,
    private categoryService: CategoryService,
    private snackBar: MatSnackBar
  ) {
    this.checkScreenSize();
  }

  ngOnInit() {
    this.loadData();
  }

  @HostListener('window:resize')
  checkScreenSize() {
    this.isMobile = window.innerWidth < 600;
  }

  loadData() {
    this.loading = true;
    
    forkJoin({
      services: this.serviceService.getServices(),
      categories: this.categoryService.getCategories()
    })
    .pipe(
      finalize(() => {
        this.loading = false;
      })
    )
    .subscribe({
      next: ({ services, categories }) => {
        this.categorias = categories;
        
        this.dataSource.data = services.map(service => ({
          id: service.id,
          categoryId: service.categoryId,
          categoria: this.getCategoryName(service.categoryId),
          codServicios: service.satKey,
          unidad: service.unitId,
          precio: service.price,
          moneda: service.moneda,
          servicio: service.name,
          descripcion: service.description
        }));
        
        // Configurar el filtrado
        this.dataSource.filterPredicate = this.createFilter();
        
        // Resetear el paginador móvil
        this.mobilePaginator.pageIndex = 0;
      },
      error: (error) => {
        console.error('Error al cargar datos:', error);
        this.snackBar.open('Error al cargar los datos', 'Cerrar', {
          duration: 3000
        });
      }
    });
  }

  /**
   * Crea una función de filtrado personalizada
   */
  createFilter(): (data: any, filter: string) => boolean {
    return (data: any, filter: string): boolean => {
      const searchTerms = filter.toLowerCase().split(' ');
      
      // Datos a buscar
      const searchableData = [
        data.servicio,
        data.descripcion,
        data.categoria,
        data.codServicios
      ].map(value => value?.toLowerCase() || '');
      
      // Comprobar que todos los términos de búsqueda existen en algún campo
      return searchTerms.every(term => 
        searchableData.some(value => value.includes(term))
      );
    };
  }

  /**
   * Aplica el filtro a la tabla
   */
  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
    
    // Resetear el paginador móvil
    this.mobilePaginator.pageIndex = 0;
  }

  /**
   * Obtiene el nombre de la categoría según su ID
   */
  getCategoryName(categoryId: number): string {
    const categoria = this.categorias.find(cat => cat.id === categoryId);
    return categoria ? categoria.name : 'Sin categoría';
  }

  /**
   * Edita un servicio existente
   */
  editarServicio(servicio: any): void {
    const dialogRef = this.dialog.open(ModalServComponent, {
      width: this.isMobile ? '95%' : '500px',
      maxWidth: this.isMobile ? '100vw' : '600px',
      data: {
        id: servicio.id,
        categoria: servicio.categoryId,
        nombre: servicio.servicio,
        claveSat: servicio.codServicios,
        descripcion: servicio.descripcion,
        moneda: servicio.moneda,
        precioPublico: servicio.precio,
        unidadSat: servicio.unidad
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loading = true;
        
        // Transformar los datos al formato que espera el backend
        const updateData = {
          name: result.nombre,
          categoryId: result.categoria,
          description: result.descripcion,
          satKey: result.claveSat,
          unitId: result.unidadSat,
          price: result.precioPublico,
          moneda: result.moneda
        };

        this.serviceService.updateService(result.id, updateData)
          .pipe(
            finalize(() => {
              this.loading = false;
            })
          )
          .subscribe({
            next: () => {
              this.snackBar.open('Servicio actualizado con éxito', 'Cerrar', {
                duration: 3000
              });
              this.loadData();
            },
            error: (error) => {
              console.error('Error al actualizar:', error);
              this.snackBar.open('Error al actualizar el servicio', 'Cerrar', {
                duration: 3000
              });
            }
          });
      }
    });
  }

  /**
   * Elimina un servicio
   */
  eliminarServicio(id: number): void {
    if (confirm('¿Está seguro de eliminar este servicio?')) {
      this.loading = true;
      
      this.serviceService.deleteService(id)
        .pipe(
          finalize(() => {
            this.loading = false;
          })
        )
        .subscribe({
          next: () => {
            this.snackBar.open('Servicio eliminado correctamente', 'Cerrar', {
              duration: 3000
            });
            this.loadData();
          },
          error: (error) => {
            console.error('Error al eliminar servicio:', error);
            this.snackBar.open('Error al eliminar el servicio', 'Cerrar', {
              duration: 3000
            });
          }
        });
    }
  }

  /**
 * Exporta los servicios a formato CSV o Excel
 * @param format Formato de exportación ('csv' o 'xlsx')
 */
exportar(format: string = 'xlsx') {
  if (this.dataSource.data.length === 0) {
    this.snackBar.open('No hay datos para exportar', 'Cerrar', {
      duration: 3000
    });
    return;
  }

  try {
    // Crear datos para exportar
    const data = this.dataSource.data.map(servicio => ({
      'Categoría': servicio.categoria || '',
      'Código de Servicio': servicio.codServicios || '',
      'Nombre del Servicio': servicio.servicio || '',
      'Descripción': servicio.descripcion || '',
      'Precio': servicio.precio || 0,
      'Moneda': servicio.moneda || 'MXN',
      'Unidad': servicio.unidad || ''
    }));

    // Crear el libro y hoja
    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(data);
    const workbook: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Servicios');

    // Ajustar anchos de columna
    const columnsWidths = [
      { wch: 20 }, // Categoría
      { wch: 15 }, // Código de Servicio
      { wch: 30 }, // Nombre del Servicio
      { wch: 40 }, // Descripción
      { wch: 12 }, // Precio
      { wch: 10 }, // Moneda
      { wch: 15 }  // Unidad
    ];
    worksheet['!cols'] = columnsWidths;

    const fileName = `servicios_${new Date().toISOString().split('T')[0]}`;

    if (format === 'csv') {
      // Exportar como CSV
      const csvContent = XLSX.utils.sheet_to_csv(worksheet);
      this.downloadFile(csvContent, `${fileName}.csv`, 'text/csv');
    } else {
      // Exportar como Excel
      XLSX.writeFile(workbook, `${fileName}.xlsx`);
    }

    this.snackBar.open(`Exportación a ${format.toUpperCase()} completada`, 'Cerrar', {
      duration: 3000
    });
  } catch (error) {
    console.error('Error al exportar datos:', error);
    this.snackBar.open('Error al exportar los datos', 'Cerrar', {
      duration: 3000
    });
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
   * Refresca los datos
   */
  refrescar() {
    this.loadData();
  }
  
  /**
   * Abre el modal para agregar un nuevo servicio
   */
  agregarServicio(): void {
    const dialogRef = this.dialog.open(ModalServComponent, {
      width: this.isMobile ? '95%' : '500px',
      maxWidth: this.isMobile ? '100vw' : '600px'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadData();
        this.snackBar.open('Servicio agregado correctamente', 'Cerrar', {
          duration: 3000
        });
      }
    });
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