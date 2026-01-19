import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { CategoryService } from '../../../services/inventory/category.service';

@Component({
    selector: 'app-modal-cat',
    templateUrl: './modal-cat.component.html',
    styleUrls: ['./modal-cat.component.css'],
    standalone: false
})
export class ModalCatComponent implements OnInit {
  categoriaForm!: FormGroup;
  isLoading = false;
  isEdit: boolean = false;
  
  constructor(
    public dialogRef: MatDialogRef<ModalCatComponent>,
    private fb: FormBuilder,
    private categoryService: CategoryService,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    console.log('Data recibida:', data); // Para debug
    this.isEdit = !!data;
  }

  ngOnInit() {
    this.categoriaForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      tipo: ['', Validators.required],
      description: ['']
    });

    if (this.isEdit && this.data) {
      console.log('Cargando datos para editar:', this.data); // Para debug
      this.categoriaForm.patchValue({
        name: this.data.categoria, // Cambiado de name a categoria
        tipo: this.data.tipo,
        description: this.data.description || ''
      });
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onAdd(): void {
    if (this.categoriaForm.valid) {
      this.isLoading = true;
      
      const categoryData = {
        name: this.categoriaForm.get('name')?.value,
        tipo: this.categoriaForm.get('tipo')?.value,
        description: this.categoriaForm.get('description')?.value
      };

      if (this.isEdit) {
        this.categoryService.updateCategory(this.data.id, categoryData).subscribe({
          next: (updatedCategory) => {
            this.dialogRef.close(updatedCategory);
          },
          error: (error) => {
            console.error('Error al actualizar la categoría:', error);
          },
          complete: () => {
            this.isLoading = false;
          }
        });
      } else {
        this.categoryService.createCategory(categoryData).subscribe({
          next: (createdCategory) => {
            this.dialogRef.close(createdCategory);
          },
          error: (error) => {
            console.error('Error al crear la categoría:', error);
          },
          complete: () => {
            this.isLoading = false;
          }
        });
      }
    }
  }
}