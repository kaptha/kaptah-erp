import { Component, OnInit, ViewEncapsulation, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Observable, firstValueFrom } from 'rxjs';
import { startWith, switchMap, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { ClaveProdServService } from '../../../services/clave-prod-serv.service';
import { UnidadMedidaService } from '../../../services/unidad-medida.service';
import { MonedaService } from '../../../services/moneda.service';
import { CategoryService } from '../../../services/inventory/category.service';
import { CreateProductDto } from '../interfaces/create-product.dto';
import { Product } from '../interfaces/product.interface';
import { ProductService } from '../../../services/inventory/product.service';
@Component({
    selector: 'app-modal-prod',
    templateUrl: './modal-prod.component.html',
    styleUrls: ['./modal-prod.component.css'],
    encapsulation: ViewEncapsulation.None,
    standalone: false
})
export class ModalProdComponent implements OnInit {
  productForm!: FormGroup;
  clavesSatFiltradas!: Observable<any[]>;
  unidadesSatFiltradas!: Observable<any[]>;
  monedasFiltradas!: Observable<any[]>;
  categorias: any[] = [];
  isEdit = false;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<ModalProdComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private claveProdServService: ClaveProdServService,
    private unidadMedidaService: UnidadMedidaService,
    private monedaService: MonedaService,
    private categoryService: CategoryService,
    private productService: ProductService
  ) {
    this.isEdit = !!data;    
  }

  ngOnInit(): void {
  // Primero inicializar el formulario (ya lo haces en el constructor)
  this.initForm();
  // Configurar el autocomplete
  this.setupAutocomplete();
  
  // Luego cargar las categorías
  this.categoryService.getCategories().subscribe({
    next: (categories) => {
      this.categorias = categories.filter(cat => cat.tipo === 'producto');
      console.log('Categorías disponibles:', this.categorias);
      
      if (this.isEdit && this.data) {
        this.setFormValues();
      }
    },
    error: (error) => console.error('Error al cargar categorías:', error)
  });
}
private setFormValues(): void {
    console.log('ID de categoría a buscar:', this.data.categoryId);
    console.log('Lista de categorías disponibles:', this.categorias);
    
    const categoriaEncontrada = this.categorias.find(c => 
      Number(c.id) === Number(this.data.categoryId)
    );

    console.log('Categoría encontrada:', categoriaEncontrada);

    this.productForm.patchValue({
      categoryId: this.data.categoryId,
      name: this.data.name,
      sku: this.data.sku,
      barcode: this.data.barcode,
      description: this.data.description,
      sat_key: this.data.sat_key,
      unit_key: this.data.unit_key,
      current_stock: Number(this.data.current_stock),
      min_stock: Number(this.data.min_stock),
      max_stock: Number(this.data.max_stock),
      price: Number(this.data.price),
      cost: Number(this.data.cost),
      currency: this.data.currency || 'MXN',
      active: this.data.active
    });
  }

private loadCategories(): void {
    this.categoryService.getCategories().subscribe({
      next: (categories) => {
        this.categorias = categories.filter(cat => cat.tipo === 'producto');
        console.log('Categorías de productos:', this.categorias);
      },
      error: (error) => {
        console.error('Error al cargar categorías:', error);
      }
    });
  }

  private initForm(): void {
  this.productForm = this.fb.group({
    categoryId: ['', Validators.required],
    name: ['', Validators.required],
    sku: [''],
    barcode: [''],
    description: [''],
    sat_key: ['', Validators.required],
    unit_key: ['', Validators.required],
    current_stock: [0, [Validators.required, Validators.min(0)]],
    min_stock: [0, [Validators.min(0)]],
    max_stock: [0, [Validators.min(0)]],
    price: [0, [Validators.required, Validators.min(0)]],
    cost: [0, [Validators.required, Validators.min(0)]],
    currency: ['MXN', Validators.required], 
    active: [true]
  });
}

  
  private setupAutocomplete(): void {
    // Mantener la lógica existente de los autocomplete pero actualizando los nombres de los campos
    this.clavesSatFiltradas = this.productForm.get('sat_key')!.valueChanges.pipe(
      startWith(''),
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(value => {
        const searchValue = typeof value === 'string' ? value : (value?.c_ClaveProdServ || '');
        return this.claveProdServService.buscarClaveProdServ(searchValue);
      })
    );

    this.unidadesSatFiltradas = this.productForm.get('unit_key')!.valueChanges.pipe(
      startWith(''),
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(value => {
        const searchValue = typeof value === 'string' ? value : '';
        return this.unidadMedidaService.buscarUnidadMedida(searchValue);
      })
    );

    this.monedasFiltradas = this.productForm.get('currency')!.valueChanges.pipe(
      startWith(''),
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(value => {
        const searchValue = typeof value === 'string' ? value : '';
        return this.monedaService.buscarMoneda(searchValue);
      })
    );
  }

  onSelectionChanged(event: any, controlName: string): void {
    const selectedItem = event.option.value;

    if (selectedItem && typeof selectedItem === 'object') {
      if (controlName === 'sat_key') {
        this.productForm.patchValue({
          sat_key: selectedItem.c_claveprodserv,
          description: selectedItem.descripcion
        });
      } else if (controlName === 'unit_key') {
        this.productForm.patchValue({
          unit_key: selectedItem.clave_unidad
        });
      } else if (controlName === 'currency') {
        this.productForm.patchValue({
          currency: selectedItem.c_moneda
        });
      }
    }
  }

  displayFn = (item: any): string => {
    if (!item) return '';
    if (typeof item === 'string') return item;
    
    return item.c_claveprodserv || item.clave_unidad || item.c_moneda || '';
  }

  onAdd(): void {
  if (this.productForm.valid) {
    const formData = this.productForm.value;
    
    // Debugging - ver qué estamos recibiendo
    console.log('FormData completo:', formData);
    console.log('sat_key tipo:', typeof formData.sat_key);
    console.log('sat_key valor:', formData.sat_key);
    
    // Extraer el valor correcto de sat_key
    let satKeyValue: string;
    if (typeof formData.sat_key === 'object' && formData.sat_key !== null) {
      // Usar la propiedad correcta en minúsculas
      satKeyValue = formData.sat_key.c_claveprodserv || 
                    formData.sat_key.c_ClaveProdServ || 
                    String(formData.sat_key);
    } else {
      satKeyValue = String(formData.sat_key);
    }

    // Extraer el valor correcto de unit_key
    let unitKeyValue: string;
    if (typeof formData.unit_key === 'object' && formData.unit_key !== null) {
      unitKeyValue = formData.unit_key.clave_unidad || 
                     formData.unit_key.c_ClaveUnidad || 
                     String(formData.unit_key);
    } else {
      unitKeyValue = String(formData.unit_key);
    }

    const productData = {
      name: formData.name,
      description: formData.description || '',
      sku: formData.sku || '',
      barcode: formData.barcode || '',
      categoryId: Number(formData.categoryId),
      satKey: satKeyValue,  // Ya es string
      unit_key: unitKeyValue,  // Ya es string
      price: Number(formData.price),
      cost: Number(formData.cost),
      minStock: Number(formData.min_stock),
      maxStock: Number(formData.max_stock),
      currentStock: Number(formData.current_stock)
    };

    // Log final para verificar
    console.log('Datos finales a enviar:', productData);
    console.log('satKey final:', productData.satKey, 'tipo:', typeof productData.satKey);

    if (this.isEdit) {
      this.productService.updateProduct(this.data.id, productData).subscribe({
        next: (response) => {
          console.log('Producto actualizado:', response);
          this.dialogRef.close(response);
        },
        error: (error) => {
          console.error('Error al actualizar producto:', error);
        }
      });
    } else {
      this.productService.createProduct(productData).subscribe({
        next: (response) => {
          console.log('Producto creado:', response);
          this.dialogRef.close(response);
        },
        error: (error) => {
          console.error('Error al crear producto:', error);
        }
      });
    }
  }
}
}
