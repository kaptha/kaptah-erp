export interface Quotation {
  id: string;
  folio: string;
  issueDate: Date;
  expirationDate?: Date;
  total: number;
  customerId: string;
  customerName: string;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
  items?: any[];
  notes?: string;
  termsAndConditions?: string;
}