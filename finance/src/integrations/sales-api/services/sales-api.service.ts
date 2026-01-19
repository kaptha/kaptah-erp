import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { AxiosRequestConfig } from 'axios';
import { CFDI } from '../interfaces/cfdi.interface';
import { SaleNote } from '../interfaces/sale-note.interface';
import { Quotation } from '../interfaces/quotation.interface';
import { SalesOrder } from '../interfaces/sales-order.interface';

@Injectable()
export class SalesApiService {
  private readonly logger = new Logger(SalesApiService.name);
  private baseUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl = this.configService.get<string>('SALES_API_URL');
  }

  private async request<T>(config: AxiosRequestConfig): Promise<T> {
    try {
      const { data } = await firstValueFrom(this.httpService.request<T>(config));
      return data;
    } catch (error) {
      this.logger.error(`Error communicating with sales-api: ${error.message}`);
      if (error.response) {
        this.logger.error(`Response status: ${error.response.status}`, error.response.data);
      } else if (error.request) {
        this.logger.error('No response received', error.request);
      }
      throw error;
    }
  }

  // CFDIs
  async getCFDI(id: string): Promise<CFDI> {
    return this.request<CFDI>({
      method: 'GET',
      url: `${this.baseUrl}/cfdi/${id}`,
    });
  }

  async listCFDIs(filters?: any): Promise<CFDI[]> {
    return this.request<CFDI[]>({
      method: 'GET',
      url: `${this.baseUrl}/cfdi`,
      params: filters,
    });
  }

  async getCFDIsByCustomer(customerId: string): Promise<CFDI[]> {
    return this.listCFDIs({ customerId });
  }

  // Notas de venta
  async getSaleNote(id: string): Promise<SaleNote> {
    return this.request<SaleNote>({
      method: 'GET',
      url: `${this.baseUrl}/sale-notes/${id}`,
    });
  }

  async listSaleNotes(filters?: any): Promise<SaleNote[]> {
    return this.request<SaleNote[]>({
      method: 'GET',
      url: `${this.baseUrl}/sale-notes`,
      params: filters,
    });
  }

  async getSaleNotesByCustomer(customerId: string): Promise<SaleNote[]> {
    return this.listSaleNotes({ customerId });
  }

  // Cotizaciones
  async getQuotation(id: string): Promise<Quotation> {
    return this.request<Quotation>({
      method: 'GET',
      url: `${this.baseUrl}/quotations/${id}`,
    });
  }

  async listQuotations(filters?: any): Promise<Quotation[]> {
    return this.request<Quotation[]>({
      method: 'GET',
      url: `${this.baseUrl}/quotations`,
      params: filters,
    });
  }

  // Órdenes de venta
  async getSalesOrder(id: string): Promise<SalesOrder> {
    return this.request<SalesOrder>({
      method: 'GET',
      url: `${this.baseUrl}/sales-orders/${id}`,
    });
  }

  async listSalesOrders(filters?: any): Promise<SalesOrder[]> {
    return this.request<SalesOrder[]>({
      method: 'GET',
      url: `${this.baseUrl}/sales-orders`,
      params: filters,
    });
  }

  // Verificación de salud de la API
  async checkHealth(): Promise<{ status: string; message: string }> {
    try {
      await this.request<any>({
        method: 'GET',
        url: `${this.baseUrl}/health`,
        timeout: 3000,
      });
      return { 
        status: 'ok', 
        message: 'Successfully connected to Sales API' 
      };
    } catch (error) {
      return { 
        status: 'error', 
        message: `Failed to connect to Sales API: ${error.message}` 
      };
    }
  }

  // Obtener todos los documentos de un cliente
  async getCustomerDocuments(customerId: string): Promise<{
    cfdis: CFDI[];
    saleNotes: SaleNote[];
    quotations: Quotation[];
    salesOrders: SalesOrder[];
  }> {
    try {
      const [cfdis, saleNotes, quotations, salesOrders] = await Promise.all([
        this.getCFDIsByCustomer(customerId),
        this.getSaleNotesByCustomer(customerId),
        this.listQuotations({ customerId }),
        this.listSalesOrders({ customerId }),
      ]);

      return {
        cfdis,
        saleNotes,
        quotations,
        salesOrders,
      };
    } catch (error) {
      this.logger.error(`Error fetching customer documents: ${error.message}`);
      throw error;
    }
  }
}