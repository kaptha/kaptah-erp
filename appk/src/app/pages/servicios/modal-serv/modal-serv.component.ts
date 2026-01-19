import { Component, OnInit, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Observable } from 'rxjs';
import { startWith, switchMap, debounceTime, distinctUntilChanged, tap } from 'rxjs/operators';
import { ClaveProdServService } from '../../../services/clave-prod-serv.service';
import { UnidadMedidaService } from '../../../services/unidad-medida.service';
import { MonedaService } from '../../../services/moneda.service';
import { CategoryService } from '../../../services/inventory/category.service';
import { ServiceService } from '../../../services/inventory/service.service';
@Component({
    selector: 'app-modal-serv',
    templateUrl: './modal-serv.component.html',
    styleUrls: ['./modal-serv.component.css'],
    standalone: false
})
export class ModalServComponent implements OnInit {
  servicioForm!: FormGroup;
  clavesSatFiltradas!: Observable<any[]>;
  unidadesSatFiltradas!: Observable<any[]>;
  monedasFiltradas!: Observable<any[]>;
  categorias: any[] = [];
  isEdit = false;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<ModalServComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private claveProdServService: ClaveProdServService,
    private unidadMedidaService: UnidadMedidaService,
    private monedaService: MonedaService,
    private categoryService: CategoryService,
    private serviceService: ServiceService
  ) {
    this.isEdit = !!data;    
  }

  ngOnInit(): void {
  // Primero inicializar el formulario
  this.initForm();
  
  // Configurar el autocomplete inmediatamente
  this.setupAutocomplete();
  
  // Luego cargar las categorías
  this.categoryService.getCategories().subscribe({
    next: (categories) => {
      this.categorias = categories.filter(cat => cat.tipo === 'servicio');
      console.log('Categorías disponibles:', this.categorias);
      
      // Si estamos en modo edición, establecer los valores
      if (this.isEdit && this.data) {
        this.setFormValues();
      }
    },
    error: (error) => {
      console.error('Error al cargar categorías:', error);
    }
  });
}
  toNumber(value: any): number {
    return Number(value);
  }

  private loadCategories(): void {
    this.categoryService.getCategories().subscribe({
      next: (categories) => {
        this.categorias = categories.filter(cat => cat.tipo === 'servicio');
        console.log('Categorías de servicios:', this.categorias);
      },
      error: (error) => {
        console.error('Error al cargar categorías:', error);
      }
    });
  }

  private initForm(): void {
    this.servicioForm = this.fb.group({
      categoria: ['', Validators.required],
      nombre: ['', Validators.required],
      descripcion: ['', Validators.required],
      precioPublico: [0, [Validators.required, Validators.min(0)]],
      claveSat: ['', Validators.required],
      unidadSat: ['', Validators.required],
      moneda: ['MXN', Validators.required]
    });
  }

  private setFormValues(): void {
  console.log('ID de categoría a buscar:', this.data.categoria); 
  console.log('Lista de categorías disponibles:', this.categorias);
  
  // Asegurarnos que la comparación se hace con el mismo tipo de dato
  const categoriaEncontrada = this.categorias.find(c => 
    Number(c.id) === Number(this.data.categoria)
  );

  console.log('Categoría encontrada:', categoriaEncontrada);

  this.servicioForm.patchValue({
    categoria: this.data.categoria, // Asegurarse que sea número
    nombre: this.data.nombre,
    claveSat: this.data.claveSat,
    descripcion: this.data.descripcion,
    unidadSat: this.data.unidadSat,
    precioPublico: Number(this.data.precioPublico) || 0,
    moneda: this.data.moneda
  });

  // Debug para verificar el valor establecido
  console.log('Valor en el formulario después de patchValue:', 
    this.servicioForm.get('categoria')?.value
  );
}

  private setupAutocomplete(): void {
    this.clavesSatFiltradas = this.servicioForm.get('claveSat')!.valueChanges.pipe(
      startWith(''),
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(value => {
        console.log('Valor en setupAutocomplete claveSat:', value);
        const searchValue = typeof value === 'string' ? value : (value?.c_ClaveProdServ || '');
        return this.claveProdServService.buscarClaveProdServ(searchValue);
      })
    );

    this.unidadesSatFiltradas = this.servicioForm.get('unidadSat')!.valueChanges.pipe(
      startWith(''),
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(value => {
        console.log('Valor en setupAutocomplete unidadSat:', value);
        const searchValue = typeof value === 'string' ? value : '';
        return this.unidadMedidaService.buscarUnidadMedida(searchValue);
      })
    );

    this.monedasFiltradas = this.servicioForm.get('moneda')!.valueChanges.pipe(
      startWith(''),
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(value => {
        console.log('Valor en setupAutocomplete moneda:', value);
        const searchValue = typeof value === 'string' ? value : '';
        return this.monedaService.buscarMoneda(searchValue);
      })
    );
  }

  displayFn = (item: any): string => {
    console.log('displayFn called with:', item);
    if (item === null || item === undefined) {
      return '';
    }
    if (typeof item === 'string') {
      return item;
    }
    if (typeof item === 'object') {
      if (item.c_claveprodserv) {
        return item.c_claveprodserv;
      } else if (item.clave_unidad) {
        return item.clave_unidad;
      } else if (item.c_moneda) {
        return item.c_moneda;
      }
      return JSON.stringify(item);
    }
    return '';
  }

  onSelectionChanged(event: any, controlName: string): void {
    const selectedItem = event.option.value;
    console.log('Opción seleccionada:', selectedItem);

    if (selectedItem && typeof selectedItem === 'object') {
      if (controlName === 'claveSat') {
        this.servicioForm.patchValue({
          claveSat: selectedItem.c_claveprodserv,
          descripcion: selectedItem.descripcion
        });
      } else if (controlName === 'unidadSat') {
        this.servicioForm.patchValue({
          unidadSat: selectedItem.clave_unidad
        });
      } else if (controlName === 'moneda') {
        this.servicioForm.patchValue({
          moneda: selectedItem.c_moneda
        });
      }
    }
  }

  guardarServicio(): void {
    if (this.servicioForm.valid) {
      const serviceData = {
        ...this.servicioForm.value,
        id: this.data?.id
      };
      console.log('Datos a guardar:', serviceData);
      this.dialogRef.close(serviceData);
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
