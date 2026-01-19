export interface SalesSummary {
  totalSales: number;
  totalTimbrados: number;  // Cambiado de totalInvoices a totalTimbrados
  averageSaleAmount: number;
}

export interface TopProduct {
  productId: string;
  productName: string;
  totalQuantity: number;
  totalRevenue: number;
}

export interface ProductSale {
  totalQuantity: number;
  totalRevenue: number;
}

export interface ClientSummary {
  totalPurchases: number;
  totalAmount: number;
}