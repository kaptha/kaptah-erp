import { Injectable } from '@nestjs/common';
import { TimbradoService } from '../timbrado/timbrado.service';
import { Timbrado, TimbradoConcepto } from '../timbrado/interface/timbrado.interface';
import { SalesSummary, TopProduct, ClientSummary, ProductSale } from './interfaces/report.interface';
import { PaymentsService } from '../payments/payments.service';
@Injectable()
export class ReportsService {
  constructor(
    private readonly timbradoService: TimbradoService,
    private readonly paymentsService: PaymentsService
  ) {}

  async getSalesSummary(startDate: Date, endDate: Date): Promise<SalesSummary> {
    const timbrados = await this.timbradoService.findByDateRange(startDate, endDate);

    const totalSales = timbrados.reduce((sum, timbrado) => sum + timbrado.total, 0);
    const totalTimbrados = timbrados.length;
    const averageSaleAmount = totalTimbrados > 0 ? totalSales / totalTimbrados : 0;

    return {
      totalSales,
      totalTimbrados,  // Cambiado para coincidir con la interfaz
      averageSaleAmount
    };
  }

  async getTopProducts(startDate: Date, endDate: Date, limit: number = 5): Promise<TopProduct[]> {
    const timbrados = await this.timbradoService.findByDateRange(startDate, endDate);
    
    const productSales: Record<string, { totalQuantity: number; totalRevenue: number }> = {};
    
    timbrados.forEach((timbrado: Timbrado) => {
      if (timbrado.conceptos && Array.isArray(timbrado.conceptos)) {
        timbrado.conceptos.forEach((concepto: TimbradoConcepto) => {
          if (!productSales[concepto.productId]) {
            productSales[concepto.productId] = { totalQuantity: 0, totalRevenue: 0 };
          }
          productSales[concepto.productId].totalQuantity += concepto.quantity;
          productSales[concepto.productId].totalRevenue += concepto.subtotal;
        });
      }
    });

    return Object.entries(productSales)
      .map(([productId, data]) => ({
        productId,
        productName: `Product ${productId}`,
        totalQuantity: data.totalQuantity,
        totalRevenue: data.totalRevenue
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, limit);
  }

  async getClientSummaries(startDate: Date, endDate: Date): Promise<ClientSummary[]> {
    const timbrados = await this.timbradoService.findByDateRange(startDate, endDate);

    const clientSummaries: Record<string, { totalPurchases: number; totalAmount: number }> = {};
    
    timbrados.forEach((timbrado: Timbrado) => {
      if (!clientSummaries[timbrado.clientId]) {
        clientSummaries[timbrado.clientId] = { totalPurchases: 0, totalAmount: 0 };
      }
      clientSummaries[timbrado.clientId].totalPurchases++;
      clientSummaries[timbrado.clientId].totalAmount += timbrado.total;
    });

    return Object.entries(clientSummaries).map(([clientId, data]) => ({
      clientId,  // Ya es string según la interfaz actualizada
      clientName: `Client ${clientId}`,
      totalPurchases: data.totalPurchases,
      totalAmount: data.totalAmount
    }));
  }
  async generateProductReport(startDate: Date, endDate: Date) {
    const timbrados = await this.timbradoService.findByDateRange(startDate, endDate);
    const productSales: { [key: string]: ProductSale } = {};

    timbrados.forEach(timbrado => {
        timbrado.conceptos?.forEach(concepto => {
            const key = concepto.claveProdServ; // Usar claveProdServ en lugar de productId
            if (!productSales[key]) {
                productSales[key] = { totalQuantity: 0, totalRevenue: 0 };
            }
            productSales[key].totalQuantity += concepto.cantidad;
            productSales[key].totalRevenue += concepto.importe;
        });
    });

    return productSales;
}

async generateClientReport(startDate: Date, endDate: Date) {
    const timbrados = await this.timbradoService.findByDateRange(startDate, endDate);
    const clientSummaries: { [key: string]: ClientSummary } = {};

    timbrados.forEach(timbrado => {
        const key = timbrado.receptorRfc; // Usar receptorRfc en lugar de clientId
        if (!clientSummaries[key]) {
            clientSummaries[key] = { totalPurchases: 0, totalAmount: 0 };
        }
        clientSummaries[key].totalPurchases++;
        clientSummaries[key].totalAmount += timbrado.total;
    });

    return clientSummaries;
}
}
