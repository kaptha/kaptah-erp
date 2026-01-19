import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger';
import { SalesApiService } from '../services/sales-api.service';
// import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';

@ApiTags('sales-api-integration')
@ApiBearerAuth()
// @UseGuards(JwtAuthGuard)
@Controller('integrations/sales-api')
export class SalesApiController {
  constructor(private readonly salesApiService: SalesApiService) {}

  @Get('health')
  @ApiOperation({ summary: 'Check health of sales-api connection' })
  checkHealth() {
    return this.salesApiService.checkHealth();
  }

  @Get('customer/:id/documents')
  @ApiOperation({ summary: 'Get all documents for a customer' })
  @ApiParam({ name: 'id', description: 'Customer ID' })
  getCustomerDocuments(@Param('id') customerId: string) {
    return this.salesApiService.getCustomerDocuments(customerId);
  }

  @Get('cfdi/:id')
  @ApiOperation({ summary: 'Get a CFDI by ID' })
  @ApiParam({ name: 'id', description: 'CFDI ID' })
  getCFDI(@Param('id') id: string) {
    return this.salesApiService.getCFDI(id);
  }

  @Get('cfdi')
  @ApiOperation({ summary: 'List CFDIs with optional filters' })
  @ApiQuery({ name: 'customerId', required: false, description: 'Filter by customer ID' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status' })
  listCFDIs(@Query() filters: any) {
    return this.salesApiService.listCFDIs(filters);
  }

  @Get('sale-notes/:id')
  @ApiOperation({ summary: 'Get a sale note by ID' })
  @ApiParam({ name: 'id', description: 'Sale note ID' })
  getSaleNote(@Param('id') id: string) {
    return this.salesApiService.getSaleNote(id);
  }

  @Get('sale-notes')
  @ApiOperation({ summary: 'List sale notes with optional filters' })
  @ApiQuery({ name: 'customerId', required: false, description: 'Filter by customer ID' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status' })
  listSaleNotes(@Query() filters: any) {
    return this.salesApiService.listSaleNotes(filters);
  }

  @Get('quotations/:id')
  @ApiOperation({ summary: 'Get a quotation by ID' })
  @ApiParam({ name: 'id', description: 'Quotation ID' })
  getQuotation(@Param('id') id: string) {
    return this.salesApiService.getQuotation(id);
  }

  @Get('quotations')
  @ApiOperation({ summary: 'List quotations with optional filters' })
  @ApiQuery({ name: 'customerId', required: false, description: 'Filter by customer ID' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status' })
  listQuotations(@Query() filters: any) {
    return this.salesApiService.listQuotations(filters);
  }

  @Get('sales-orders/:id')
  @ApiOperation({ summary: 'Get a sales order by ID' })
  @ApiParam({ name: 'id', description: 'Sales order ID' })
  getSalesOrder(@Param('id') id: string) {
    return this.salesApiService.getSalesOrder(id);
  }

  @Get('sales-orders')
  @ApiOperation({ summary: 'List sales orders with optional filters' })
  @ApiQuery({ name: 'customerId', required: false, description: 'Filter by customer ID' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status' })
  listSalesOrders(@Query() filters: any) {
    return this.salesApiService.listSalesOrders(filters);
  }
}
