export interface BranchInventory {
  id: number;
  userId: string;
  branch_id: number;
  product_id: number;
  quantity: number;
  min_stock: number;
  max_stock: number | null;
  cost: number;
  last_movement_date: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface BranchInventoryWithDetails extends BranchInventory {
  product_name: string;
  product_code: string;
  branch_alias: string;
  total_value: number;
  stock_status: 'ok' | 'low' | 'critical' | 'out';
}
