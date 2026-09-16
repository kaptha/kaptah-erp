import { Component, Inject, ViewEncapsulation } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

interface PlanOption {
  key: string;
  backendKey: string;
  nombre: string;
  mensual: number;
  anual: number;
  ahorro: number;
  soloAnual?: boolean;
  features: string[];
}

@Component({
  selector: 'app-cambiar-plan-modal',
  templateUrl: './cambiar-plan-modal.component.html',
  styleUrls: ['./cambiar-plan-modal.component.css'],
  encapsulation: ViewEncapsulation.None,
  standalone: false
})
export class CambiarPlanModalComponent {
  ciclo: 'mensual' | 'anual' = 'anual';
  planSeleccionado: string = '';

  planes: PlanOption[] = [
    {
      key: 'starter',
      backendKey: 'basico',
      nombre: 'Kaptah Basico',
      mensual: 0,
      anual: 599,
      ahorro: 0,
      soloAnual: true,
      features: ['Facturacion electronica', 'Clientes y proveedores', 'Cotizaciones']
    },
    {
      key: 'pro',
      backendKey: 'fiscal',
      nombre: 'Kaptah Fiscal',
      mensual: 299,
      anual: 2990,
      ahorro: 598,
      features: ['Todo de Basico', 'Descarga masiva SAT', 'Reportes fiscales', 'Conciliacion']
    },
    {
      key: 'business',
      backendKey: 'erp',
      nombre: 'Kaptah ERP',
      mensual: 599,
      anual: 5990,
      ahorro: 1198,
      features: ['Todo de Fiscal', 'Inventarios', 'Punto de venta', 'Cuentas por cobrar/pagar']
    },
    {
      key: 'enterprise',
      backendKey: 'ilimitado',
      nombre: 'Kaptah Ilimitado',
      mensual: 999,
      anual: 9990,
      ahorro: 1998,
      features: ['Todo de ERP', 'Usuarios ilimitados', 'Soporte prioritario', 'API acceso completo']
    }
  ];

  constructor(
    public dialogRef: MatDialogRef<CambiarPlanModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { planActual: string; cicloActual: string }
  ) {
    this.planSeleccionado = data.planActual;
    this.ciclo = (data.cicloActual as 'mensual' | 'anual') || 'anual';
  }

  getPrecio(plan: PlanOption): number {
    if (plan.soloAnual) return plan.anual;
    return this.ciclo === 'mensual' ? plan.mensual : plan.anual;
  }

  getPeriodo(plan: PlanOption): string {
    if (plan.soloAnual) return '/ano';
    return this.ciclo === 'mensual' ? '/mes' : '/ano';
  }

  esPlanActual(plan: PlanOption): boolean {
    return plan.key === this.data.planActual;
  }

  seleccionarPlan(plan: PlanOption): void {
    if (this.esPlanActual(plan)) return;
    this.dialogRef.close({
      plan: plan.key,
      backendKey: plan.backendKey,
      cicloFacturacion: plan.soloAnual ? 'anual' : this.ciclo,
      nombre: plan.nombre
    });
  }

  cancelar(): void {
    this.dialogRef.close(null);
  }
}
