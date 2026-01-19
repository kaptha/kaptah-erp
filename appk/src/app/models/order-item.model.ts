export interface OrderItem {
  type: 'product' | 'service';
  itemId: number;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}