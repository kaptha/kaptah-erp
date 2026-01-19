export interface SalesOrderItem {
  productId: string;
  quantity: number;
  description: string;
  unitPrice: number;
  subtotal?: number;
  tax?: number;
  total?: number;
}