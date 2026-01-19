import { Controller, Get, Query } from '@nestjs/common';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('sales-summary')
  getSalesSummary(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string
  ) {
    return this.reportsService.getSalesSummary(new Date(startDate), new Date(endDate));
  }

  @Get('top-products')
  getTopProducts(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('limit') limit: string
  ) {
    return this.reportsService.getTopProducts(
      new Date(startDate),
      new Date(endDate),
      limit ? parseInt(limit) : undefined
    );
  }

  @Get('client-summaries')
  getClientSummaries(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string
  ) {
    return this.reportsService.getClientSummaries(new Date(startDate), new Date(endDate));
  }
}
