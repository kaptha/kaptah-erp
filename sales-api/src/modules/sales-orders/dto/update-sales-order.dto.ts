import { IsOptional, IsString, IsNumber, IsArray } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { SalesOrderItem } from '../interfaces/sales-order-item.interface';
export class UpdateSalesOrderDto {
  @ApiPropertyOptional({ description: 'Nombre del cliente' })
  @IsOptional()
  @IsString()
  customerName?: string;

  @ApiPropertyOptional({ description: 'Dirección del cliente' })
  @IsOptional()
  @IsString()
  customerAddress?: string;

  @ApiPropertyOptional({ description: 'RFC del cliente' })
  @IsOptional()
  @IsString()
  customerRfc?: string;

  @ApiPropertyOptional({
    description: 'Lista de productos',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        productId: { type: 'string' },
        quantity: { type: 'number' },
        description: { type: 'string' },
        unitPrice: { type: 'number' },
        subtotal: { type: 'number' },
        tax: { type: 'number' },
        total: { type: 'number' }
      }
    }
  })
  @IsOptional()
  @IsArray()
  items?: SalesOrderItem[];

  @ApiPropertyOptional({ description: 'Subtotal de la orden' })
  @IsOptional()
  @IsNumber()
  subtotal?: number;

  @ApiPropertyOptional({ description: 'Impuestos de la orden' })
  @IsOptional()
  @IsNumber()
  tax?: number;

  @ApiPropertyOptional({ description: 'Total de la orden' })
  @IsOptional()
  @IsNumber()
  total?: number;

  @ApiPropertyOptional({ 
    description: 'Estado de la orden',
    enum: ['PENDING', 'APPROVED', 'DELIVERED', 'CANCELLED']
  })
  @IsOptional()
  @IsString()
  status?: string;
}