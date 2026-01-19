export interface SaleNote {
  id: string;
  folio: string;
  issueDate: Date;
  dueDate: Date;
  total: number;
  customerId: string;
  customerName: string;
  status: string;
  // Otros campos relevantes de las notas de venta
}
