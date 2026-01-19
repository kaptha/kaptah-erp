export interface Order {
  id?: number;
  folio: string;
  customerId: number;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  status?: string;
  createdAt?: Date;
}