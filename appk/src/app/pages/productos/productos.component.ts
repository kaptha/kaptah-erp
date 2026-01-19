import { Component, OnInit, ViewChild, ViewEncapsulation, HostListener } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableDataSource } from '@angular/material/table';
import { finalize } from 'rxjs';
import * as XLSX from 'xlsx';
import { ModalProdComponent } from './modal-prod/modal-prod.component';
import { Product } from './interfaces/product.interface';
import { ProductService } from '../../services/inventory/product.service';
import { CategoryService } from '../../services/inventory/category.service';

interface MobilePaginator {
  pageSize: number;
  pageIndex: number;
}

@Component({
    selector: 'app-productos',
    templateUrl: './productos.component.html',
    styleUrls: ['./productos.component.css'],
    encapsulation: ViewEncapsulation.None,
    standalone: false
})
export class ProductosComponent implements OnInit {
  displayedColumns: string[] = ['sku', 'name', 'current_stock', 'price', 'categoryId', 'active', 'acciones'];
  dataSource: MatTableDataSource<Product>;
  isMobile = false;
  isLoading = false;
  categories: any[] = [];
  
  // Paginador móvil
  mobilePaginator: MobilePaginator = {
    pageSize: 5,
    pageIndex: 0
  };

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    public dialog: MatDialog,
    private snackBar: MatSnackBar,
    private productService: ProductService,
    private categoryService: CategoryService
  ) {
    this.dataSource = new MatTableDataSource();
    this.checkScreenSize();
  }

  ngOnInit() {
    this.loadCategories();
    this.loadProducts();
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  @HostListener('window:resize')
  checkScreenSize() {
    this.isMobile = window.innerWidth < 600;
  }

  loadCategories(): void {
    this.categoryService.getCategories().subscribe({
      next: (categories) => {
        this.categories = categories;
      },
      error: (error) => {
        console.error('Error cargando categorías:', error);
      }
    });
  }

  getCategoryName(categoryId: number): string {
    const category = this.categories.find(cat => cat.id === categoryId);
    return category ? category.name : 'Sin categoría';
  }

  loadProducts(): void {
    this.isLoading = true;
    
    this.productService.getProducts()
      .pipe(
        finalize(() => {
          this.isLoading = false;
        })
      )
      .subscribe({
        next: (products) => {
          this.dataSource.data = products;
          
          // Reiniciar paginador móvil
          this.mobilePaginator.pageIndex = 0;
        },
        error: (error) => {
          console.error('Error cargando productos:', error);
          this.snackBar.open('Error al cargar los productos', 'Cerrar', {
            duration: 3000
          });
        }
      });
  }

  editarProducto(producto: any): void {
    const categoryName = producto.category?.name || this.getCategoryName(producto.categoryId) || 'Categoría no definida';
    
    const dialogData = {
      id: producto.id,
      categoryId: producto.categoryId || 0,
      categoryName: categoryName,
      name: producto.name || '',
      sku: producto.sku || '',
      barcode: producto.barcode || '',
      description: producto.description || '',
      sat_key: producto.satKey || producto.sat_key || '',
      unit_key: producto.unit_key || 'H87',
      current_stock: producto.currentStock || producto.current_stock || 0,
      min_stock: producto.minStock || producto.min_stock || 0,
      max_stock: producto.maxStock || producto.max_stock || 0,
      price: producto.price || 0,
      cost: producto.cost || 0,
      active: producto.active ?? true,
      category: producto.category || { id: producto.categoryId, name: categoryName }
    };

    const dialogRef = this.dialog.open(ModalProdComponent, {
      width: this.isMobile ? '95%' : '800px',
      maxWidth: this.isMobile ? '100vw' : '800px',
      disableClose: true,
      autoFocus: false,
      data: dialogData
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.isLoading = true;
        
        const updateData = {
          name: result.name,
          categoryId: result.categoryId,
          description: result.description,
          satKey: result.sat_key,
          unit_key: result.unit_key,
          current_stock: result.current_stock,
          min_stock: result.min_stock,
          max_stock: result.max_stock,
          price: result.price,
          cost: result.cost,
          active: result.active
        };

        this.productService.updateProduct(result.id, updateData)
          .pipe(
            finalize(() => {
              this.isLoading = false;
            })
          )
          .subscribe({
            next: () => {
              this.snackBar.open('Producto actualizado con éxito', 'Cerrar', {
                duration: 3000
              });
              this.loadProducts();
            },
            error: (error) => {
              console.error('Error al actualizar:', error);
              this.snackBar.open('Error al actualizar el producto', 'Cerrar', {
                duration: 3000
              });
            }
          });
      }
    });
  }

  eliminarProducto(product: Product): void {
    if (confirm('¿Está seguro de que desea eliminar este producto?')) {
      this.isLoading = true;
      
      this.productService.deleteProduct(product.id)
        .pipe(
          finalize(() => {
            this.isLoading = false;
          })
        )
        .subscribe({
          next: () => {
            this.snackBar.open('Producto eliminado con éxito', 'Cerrar', {
              duration: 3000
            });
            this.loadProducts();
          },
          error: (error) => {
            console.error('Error eliminando producto:', error);
            this.snackBar.open('Error al eliminar el producto', 'Cerrar', {
              duration: 3000
            });
          }
        });
    }
  }

  agregarProducto(): void {
    const dialogRef = this.dialog.open(ModalProdComponent, {
      width: this.isMobile ? '95%' : '800px',
      maxWidth: this.isMobile ? '100vw' : '800px',
      disableClose: true,
      autoFocus: false
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadProducts();
      }
    });
  }

  /**
 * Exporta los productos a formato CSV o Excel
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
    const data = this.dataSource.data.map(product => ({
      'SKU': product.sku || '',
      'Nombre': product.name || '',
      'Descripción': product.description || '',
      'Código de Barras': product.barcode || '',
      'Clave SAT': product.sat_key || '',
      'Unidad': product.unit_key || '',
      'Precio': product.price || 0,
      'Costo': product.cost || 0,
      'Stock Actual': product.current_stock || 0,
      'Stock Mínimo': product.min_stock || 0,
      'Stock Máximo': product.max_stock || 0,
      'Categoría': this.getCategoryName(product.categoryId) || '',
      'Estado': product.active ? 'Activo' : 'Inactivo',
      'Fecha de Creación': product.created_at ? new Date(product.created_at).toLocaleDateString() : '',
      'Última Actualización': product.updated_at ? new Date(product.updated_at).toLocaleDateString() : ''
    }));

    // Crear el libro y hoja
    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(data);
    const workbook: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Productos');

    // Ajustar anchos de columna
    const columnsWidths = [
      { wch: 15 }, // SKU
      { wch: 30 }, // Nombre
      { wch: 40 }, // Descripción
      { wch: 20 }, // Código de Barras
      { wch: 15 }, // Clave SAT
      { wch: 10 }, // Unidad
      { wch: 12 }, // Precio
      { wch: 12 }, // Costo
      { wch: 12 }, // Stock Actual
      { wch: 12 }, // Stock Mínimo
      { wch: 12 }, // Stock Máximo
      { wch: 20 }, // Categoría
      { wch: 10 }, // Estado
      { wch: 15 }, // Fecha de Creación
      { wch: 15 }  // Última Actualización
    ];
    worksheet['!cols'] = columnsWidths;

    const fileName = `productos_${new Date().toISOString().split('T')[0]}`;

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

  refrescar() {
    this.loadProducts();
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
    
    // Resetear el paginador móvil
    this.mobilePaginator.pageIndex = 0;
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
