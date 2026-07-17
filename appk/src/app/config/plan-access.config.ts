/**
 * Configuracion de acceso a modulos por plan
 * Cada plan hereda los modulos del plan anterior + agrega los suyos
 */

export type PlanType = 'starter' | 'fiscal' | 'business' | 'enterprise';

// Mapeo de nombres legacy a los nuevos
export const PLAN_NAME_MAP: Record<string, PlanType> = {
  'basico': 'starter',
  'Basico': 'starter',
  'starter': 'starter',
  'Starter': 'starter',
  'fiscal': 'fiscal',
  'Fiscal': 'fiscal',
  'pro': 'fiscal',
  'Pro': 'fiscal',
  'business': 'business',
  'Business': 'business',
  'erp': 'business',
  'ERP': 'business',
  'enterprise': 'enterprise',
  'Enterprise': 'enterprise',
  'ilimitado': 'enterprise',
  'Ilimitado': 'enterprise',
};

// Modulos disponibles por plan
export const PLAN_MODULES: Record<PlanType, string[]> = {
  starter: [
    'clientes',
    'proveedores',
    'productos',
    'servicios',
    'categorias',
    'cotizaciones',
    'notas_venta',
    'cfdi',
    'ingresos',
    'descarga_cfdi',
    'empleados',
  ],

  fiscal: [
    // Todo lo de starter +
    'clientes',
    'proveedores',
    'productos',
    'servicios',
    'categorias',
    'cotizaciones',
    'notas_venta',
    'cfdi',
    'ingresos',
    'descarga_cfdi',
    'empleados',
    // Nuevos en fiscal:
    'egresos',
    'ordenes_compra',
    'cuentas_cobrar',
    'cuentas_pagar',
    'descarga_sat',
  ],

  business: [
    // Todo lo de fiscal +
    'clientes',
    'proveedores',
    'productos',
    'servicios',
    'categorias',
    'cotizaciones',
    'notas_venta',
    'cfdi',
    'ingresos',
    'descarga_cfdi',
    'empleados',
    'egresos',
    'ordenes_compra',
    'cuentas_cobrar',
    'cuentas_pagar',
    'descarga_sat',
    // Nuevos en business:
    'ordenes_venta',
    'guias_remision',
    'inventario',
    'inventario_multi_sucursal',
    'nomina',
  ],

  enterprise: [
    // Todo lo de business (todo incluido)
    'clientes',
    'proveedores',
    'productos',
    'servicios',
    'categorias',
    'cotizaciones',
    'notas_venta',
    'cfdi',
    'ingresos',
    'descarga_cfdi',
    'empleados',
    'egresos',
    'ordenes_compra',
    'cuentas_cobrar',
    'cuentas_pagar',
    'descarga_sat',
    'ordenes_venta',
    'guias_remision',
    'inventario',
    'inventario_multi_sucursal',
    'nomina',
  ],
};

/**
 * Limites por plan
 */
export const PLAN_LIMITS: Record<PlanType, { timbresPerMonth: number; storageMB: number; maxUsers: number }> = {
  starter:    { timbresPerMonth: 5,   storageMB: 5120,   maxUsers: 5 },
  fiscal:     { timbresPerMonth: 100, storageMB: 20480,  maxUsers: -1 },
  business:   { timbresPerMonth: 250, storageMB: 102400, maxUsers: -1 },
  enterprise: { timbresPerMonth: -1,  storageMB: 512000, maxUsers: -1 },
};

/**
 * Verifica si un modulo esta disponible para un plan dado
 */
export function hasModuleAccess(plan: string | null, module: string): boolean {
  if (!plan) return false;
  const normalizedPlan = PLAN_NAME_MAP[plan];
  if (!normalizedPlan) return false;
  return PLAN_MODULES[normalizedPlan].includes(module);
}

/**
 * Obtiene todos los modulos disponibles para un plan
 */
export function getModulesForPlan(plan: string | null): string[] {
  if (!plan) return [];
  const normalizedPlan = PLAN_NAME_MAP[plan];
  if (!normalizedPlan) return [];
  return PLAN_MODULES[normalizedPlan];
}

/**
 * Obtiene los limites de un plan
 */
export function getPlanLimits(plan: string | null) {
  if (!plan) return null;
  const normalizedPlan = PLAN_NAME_MAP[plan];
  if (!normalizedPlan) return null;
  return PLAN_LIMITS[normalizedPlan];
}
