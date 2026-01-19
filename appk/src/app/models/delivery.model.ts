export interface DeliveryNote {
  id: string;
  folio: string;
  salesOrderId: string;
  userId: string;
  sucursalId?: number;
  deliveryDate: Date | string;
  status: 'PENDING' | 'TRANSIT' | 'DELIVERED' | 'CANCELLED';
  items: DeliveryNoteItem[];
  notes?: string; // ✅ AGREGADO
  createdAt: Date | string;
  updatedAt: Date | string;
  createdBy: string;
  salesOrder?: SalesOrder; // ✅ AGREGADO (opcional, puede venir del backend)
}

export interface DeliveryNoteItem {
  productId: string;
  description: string;
  quantity: number;
  deliveredQuantity: number;
}

// ✅ NUEVO: Interfaz para la orden de venta relacionada
export interface SalesOrder {
  id: string;
  folio: string;
  customerName: string;
  customerRfc: string;
  customerAddress: string;
  subtotal: number;
  tax: number;
  total: number;
  status: string;
  items: any[];
  createdAt: Date | string;
  updatedAt: Date | string;
}