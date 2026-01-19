export interface Product {
  id: number;
  name: string;
  description?: string;
  price: number;
  stock?: number; // Campo legacy (mantener por compatibilidad)
  currentStock?: number; // ✅ Campo real de la BD (camelCase)
  sku?: string;
  barcode?: string;
  cost?: number;
  minStock?: number;
  maxStock?: number;
  active?: boolean;
  satkey?: number | string; 
  unit_key?: string;
}