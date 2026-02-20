export type TransferStatus = 'pending' | 'in_transit' | 'completed' | 'cancelled';

export interface BranchTransfer {
  id: number;
  userId: string;
  transfer_number: string;
  from_branch_id: number;
  to_branch_id: number;
  status: TransferStatus;
  requested_by: string;
  approved_by: string | null;
  shipped_date: Date | null;
  received_date: Date | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface BranchTransferWithItems extends BranchTransfer {
  items: BranchTransferItem[];
  from_branch_alias: string;
  to_branch_alias: string;
  total_products: number;
  total_value: number;
}

export interface BranchTransferItem {
  id: number;
  transfer_id: number;
  product_id: number;
  quantity: number;
  cost: number;
  notes: string | null;
  created_at: Date;
  product_name?: string;
  product_code?: string;
}
