export interface SalesOrderItem {
  productId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  tax: number;
  total: number;
}

export interface SalesOrder {
  id: string;
  folio: string;
  customerName: string;
  customerAddress: string;
  customerRfc: string;
  subtotal: number;
  tax: number;
  total: number;
  status: 'PENDING' | 'APPROVED' | 'DELIVERED' | 'CANCELLED';
  items: SalesOrderItem[];
  sucursalId?: number;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  createdBy: string;
}