interface Category {
  id: number;
  name: string;
  description?: string;
  active?: boolean;
}
export interface Product {
  id: number;
  name: string;
  description: string;
  sku: string;
  barcode: string;
  sat_key: string;
  price: number;
  cost: number;
  min_stock: number;
  max_stock: number;
  current_stock: number;
  active: boolean;
  unit_key: string;
  categoryId: number;
  category?: Category;
  userId: number;
  created_at: string;
  updated_at: string;
  stock?: number;
}