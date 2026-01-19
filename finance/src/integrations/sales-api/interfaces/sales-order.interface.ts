export interface SalesOrder {
  id: string;
  folio: string;
  issueDate: Date;
  deliveryDate?: Date;
  total: number;
  customerId: string;
  customerName: string;
  status: 'pending' | 'processing' | 'completed' | 'canceled';
  items?: any[];
  shippingAddress?: string;
  notes?: string;
}