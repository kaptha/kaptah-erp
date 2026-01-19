import { Component, OnInit, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableDataSource } from '@angular/material/table';
import { finalize } from 'rxjs';

import { ModalCatComponent } from './modal-cat/modal-cat.component';
import { CategoryService } from '../../services/inventory/category.service';

@Component({
    selector: 'app-categorias',
    templateUrl: './categorias.component.html',
    styleUrls: ['./categorias.component.css'],
    standalone: false
})
export class CategoriasComponent implements OnInit {
  displayedColumns: string[] = ['categoria', 'tipo', 'acciones'];
  dataSource = new MatTableDataSource<any>([]);
  loading = false;
  isMobile = false;
  
  constructor(
    public dialog: MatDialog,
    private categoryService: CategoryService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    this.checkScreenSize();
    this.loadCategories();
    
    // Detectar cambios en el tamaño de la ventana
    window.addEventListener('resize', () => {
      this.checkScreenSize();
    });
  }

  // Verificar si estamos en un dispositivo móvil
  checkScreenSize() {
    this.isMobile = window.innerWidth < 600;
  }

  // Cargar categorías con indicador de carga
  loadCategories() {
    this.loading = true;
    
    this.categoryService.getCategories()
      .pipe(
        finalize(() => {
          this.loading = false;
        })
      )
      .subscribe({
        next: (categories) => {
          this.dataSource.data = categories.map(category => ({
            id: category.id,
            categoria: category.name, 
            tipo: category.tipo,
            description: category.description || ''
          }));
        },
        error: (error) => {
          console.error('Error al cargar categorías:', error);
          this.snackBar.open('Error al cargar las categorías', 'Cerrar', {
            duration: 3000
          });
        }
      });
  }

  // Agregar categoría
  agregarCategoria(): void {
    const dialogRef = this.dialog.open(ModalCatComponent, {
      width: this.isMobile ? '95%' : '400px',
      maxWidth: this.isMobile ? '100vw' : '500px',
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Crear nueva categoría
        const newCategory = {
          name: result.name,
          tipo: result.tipo,
          description: result.description || ''
        };

        this.loading = true;
        this.categoryService.createCategory(newCategory)
          .pipe(
            finalize(() => {
              this.loading = false;
            })
          )
          .subscribe({
            next: () => {
              this.snackBar.open('Categoría creada con éxito', 'Cerrar', {
                duration: 3000
              });
              this.loadCategories();
            },
            error: (error) => {
              console.error('Error al crear categoría:', error);
              this.snackBar.open('Error al crear la categoría', 'Cerrar', {
                duration: 3000
              });
            }
          });
      }
    });
  }

  // Editar categoría
  editarCategoria(categoria: any): void {
    const dialogRef = this.dialog.open(ModalCatComponent, {
      width: this.isMobile ? '95%' : '400px',
      maxWidth: this.isMobile ? '100vw' : '500px',
      data: {
        id: categoria.id,
        name: categoria.categoria,
        tipo: categoria.tipo,
        description: categoria.description
      },
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        const updatedCategory = {
          name: result.name,
          tipo: result.tipo,
          description: result.description || ''
        };

        this.loading = true;
        this.categoryService.updateCategory(categoria.id, updatedCategory)
          .pipe(
            finalize(() => {
              this.loading = false;
            })
          )
          .subscribe({
            next: () => {
              this.snackBar.open('Categoría actualizada con éxito', 'Cerrar', {
                duration: 3000
              });
              this.loadCategories();
            },
            error: (error) => {
              console.error('Error al actualizar categoría:', error);
              this.snackBar.open('Error al actualizar la categoría', 'Cerrar', {
                duration: 3000
              });
            }
          });
      }
    });
  }

  // Eliminar categoría
  eliminarCategoria(id: number): void {
    if (confirm('¿Está seguro de eliminar esta categoría?')) {
      this.loading = true;
      
      this.categoryService.deleteCategory(id)
        .pipe(
          finalize(() => {
            this.loading = false;
          })
        )
        .subscribe({
          next: () => {
            this.snackBar.open('Categoría eliminada con éxito', 'Cerrar', {
              duration: 3000
            });
            this.loadCategories();
          },
          error: (error) => {
            console.error('Error al eliminar categoría:', error);
            this.snackBar.open('Error al eliminar la categoría', 'Cerrar', {
              duration: 3000
            });
          }
        });
    }
  }

  // Refrescar la lista de categorías
  refrescar() {
    this.loadCategories();
  }
}
