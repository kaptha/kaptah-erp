export interface CFDI {
  id: string;
  folio: string;
  series: string;
  issueDate: Date;
  total: number;
  subtotal: number;
  taxes: number;
  customerId: string;
  customerName: string;
  status: string;
  // Otros campos relevantes del CFDI
}
