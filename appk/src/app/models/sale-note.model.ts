export interface SaleNote {
  id: string;
  customerName: string;
  customerRfc: string;
  saleDate: Date;
  total: number;
  items: any[];
  folio: string;
  sucursalId?: number;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  paymentMethod: string;
  status: 'COMPLETED' | 'PENDING' | 'CANCELLED';
}

export interface SaleNoteItem {
  productId?: number;
  description: string;
  quantity: number;
  unitPrice: number;
  subtotal?: number;
}