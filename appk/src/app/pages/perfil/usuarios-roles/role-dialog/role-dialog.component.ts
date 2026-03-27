import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

interface ModulePermission {
  key: string;
  label: string;
  leer: boolean;
  crear: boolean;
  editar: boolean;
  eliminar: boolean;
}

@Component({
  selector: 'app-role-dialog',
  templateUrl: './role-dialog.component.html',
  styleUrls: ['./role-dialog.component.css'],
  standalone: false
})
export class RoleDialogComponent {
  form: FormGroup;
  mode: 'create' | 'edit' | 'view';
  modules: ModulePermission[] = [];

  private moduleLabels: Record<string, string> = {
    clientes: 'Clientes',
    proveedores: 'Proveedores',
    empleados: 'Empleados',
    categorias: 'Categorias',
    productos: 'Productos',
    servicios: 'Servicios',
    inventario_multi_sucursal: 'Inventario Multi-Sucursal',
    ordenes_compra: 'Ordenes de Compra',
    cotizaciones: 'Cotizaciones',
    ordenes_venta: 'Ordenes de Venta',
    guias_remision: 'Guias de Remision',
    notas_venta: 'Notas de Venta',
    cuentas_cobrar: 'Cuentas por Cobrar',
    cuentas_pagar: 'Cuentas por Pagar',
    ingresos: 'Ingresos',
    egresos: 'Egresos',
    cfdi: 'CFDI',
    descarga_cfdi: 'Descarga de CFDIs',
    roles: 'Gestion de Roles'
  };

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<RoleDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.mode = data.mode;

    this.form = this.fb.group({
      nombre: [data.role?.nombre || '', Validators.required],
      descripcion: [data.role?.descripcion || '']
    });

    this.initModules(data.role?.permisos);

    if (this.mode === 'view') {
      this.form.disable();
    }
  }

  private initModules(permisos?: Record<string, any>): void {
    this.modules = Object.keys(this.moduleLabels).map(key => ({
      key,
      label: this.moduleLabels[key],
      leer: permisos?.[key]?.leer || false,
      crear: permisos?.[key]?.crear || false,
      editar: permisos?.[key]?.editar || false,
      eliminar: permisos?.[key]?.eliminar || false
    }));
  }

  toggleAll(action: 'leer' | 'crear' | 'editar' | 'eliminar'): void {
    if (this.mode === 'view') return;
    const allTrue = this.modules.every(m => m[action]);
    this.modules.forEach(m => m[action] = !allTrue);
  }

  toggleRow(module: ModulePermission): void {
    if (this.mode === 'view') return;
    const allTrue = module.leer && module.crear && module.editar && module.eliminar;
    module.leer = !allTrue;
    module.crear = !allTrue;
    module.editar = !allTrue;
    module.eliminar = !allTrue;
  }

  isAllChecked(action: 'leer' | 'crear' | 'editar' | 'eliminar'): boolean {
    return this.modules.every(m => m[action]);
  }

  save(): void {
    if (this.form.invalid) return;

    const permisos: Record<string, any> = {};
    this.modules.forEach(m => {
      permisos[m.key] = {
        leer: m.leer,
        crear: m.crear,
        editar: m.editar,
        eliminar: m.eliminar
      };
    });

    this.dialogRef.close({
      nombre: this.form.value.nombre,
      descripcion: this.form.value.descripcion,
      permisos
    });
  }

  cancel(): void {
    this.dialogRef.close();
  }

  getTitle(): string {
    switch (this.mode) {
      case 'create': return 'Crear Rol Personalizado';
      case 'edit': return 'Editar Rol';
      case 'view': return 'Permisos del Rol';
    }
  }
}
