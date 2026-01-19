import { Injectable, Logger } from '@nestjs/common';
import { SalesApiService } from '../../integrations/sales-api/services/sales-api.service';
import { AccountsReceivableService } from '../accounts-receivable.service';
import { CreateAccountReceivableDto } from '../dto/create-account-receivable.dto/create-account-receivable.dto';

@Injectable()
export class AccountsReceivableIntegrationService {
  private readonly logger = new Logger(AccountsReceivableIntegrationService.name);

  constructor(
    private readonly salesApiService: SalesApiService,
    private readonly accountsReceivableService: AccountsReceivableService,
  ) {}

  /**
   * Obtiene documentos pendientes de un cliente
   */
  async getCustomerPendingDocuments(customerId: string) {
    try {
      // Obtener todos los documentos del cliente
      const { cfdis, saleNotes } = await this.salesApiService.getCustomerDocuments(customerId);

      // Filtrar solo los documentos pendientes de pago
      const pendingCfdis = cfdis.filter(cfdi => cfdi.status !== 'paid' && cfdi.status !== 'canceled');
      const pendingSaleNotes = saleNotes.filter(note => note.status !== 'completed' && note.status !== 'canceled');

      return {
        pendingCfdis,
        pendingSaleNotes,
      };
    } catch (error) {
      this.logger.error(`Error fetching customer pending documents: ${error.message}`);
      throw error;
    }
  }

  /**
   * Crea una cuenta por cobrar a partir de un documento de sales-api
   */
  async createAccountFromDocument(
    documentId: string, 
    documentType: 'cfdi' | 'saleNote',
    creditDays: number,
    userId: string
  ) {
    try {
      let document;
      let documentData;

      // Obtener el documento según su tipo
      if (documentType === 'cfdi') {
        document = await this.salesApiService.getCFDI(documentId);
        documentData = {
          documentId: document.id,
          documentType: 'CFDI',
          documentNumber: document.folio,
          documentReference: document.uuid || document.id,
          customerId: document.customerId,
          customerName: document.customerName,
          issueDate: document.issueDate,
          dueDate: this.calculateDueDate(document.issueDate, creditDays),
          totalAmount: document.total,
          concept: `CFDI ${document.series || ''} ${document.folio}`,
        };
      } else {
        document = await this.salesApiService.getSaleNote(documentId);
        documentData = {
          documentId: document.id,
          documentType: 'SALE_NOTE',
          documentNumber: document.folio,
          documentReference: document.id,
          customerId: document.customerId,
          customerName: document.customerName,
          issueDate: document.issueDate,
          dueDate: document.dueDate || this.calculateDueDate(document.issueDate, creditDays),
          totalAmount: document.total,
          concept: `Nota de venta ${document.folio}`,
        };
      }

      // Crear la cuenta por cobrar
      const createDto: CreateAccountReceivableDto = {
        ...documentData,
        creditDays,
      };

      const newAccount = await this.accountsReceivableService.create(createDto, userId);
      return newAccount;
    } catch (error) {
      this.logger.error(`Error creating account from document: ${error.message}`);
      throw error;
    }
  }

  /**
   * Calcula la fecha de vencimiento basada en los días de crédito
   */
  private calculateDueDate(issueDate: Date, creditDays: number): Date {
    const dueDate = new Date(issueDate);
    dueDate.setDate(dueDate.getDate() + creditDays);
    return dueDate;
  }
}
