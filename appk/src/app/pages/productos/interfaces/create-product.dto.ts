export interface CreateProductDto {
  name: string;
  description?: string;
  sku?: string;
  barcode?: string;
  satKey: string;
  unit_key: string;
  categoryId: number;
  price: number;
  cost: number;
  minStock?: number;
  maxStock?: number;
  currentStock: number;
  active?: boolean;
}