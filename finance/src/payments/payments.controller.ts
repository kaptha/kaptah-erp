import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query, Req } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
// Importa el guard de autenticación que estés usando
// import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('payments')
@ApiBearerAuth()
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  create(@Body() createPaymentDto: CreatePaymentDto, @Req() req) {
    const userId = req.user?.id || 'dev-user-id'; // Fallback para desarrollo
    return this.paymentsService.create(createPaymentDto, userId);
  }

  @Get()
  findAll() {
    return this.paymentsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.paymentsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updatePaymentDto: UpdatePaymentDto) {
    return this.paymentsService.update(id, updatePaymentDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.paymentsService.remove(id);
  }

  @Get('account-payable/:id')
  findByAccountPayable(@Param('id') accountPayableId: string) {
    return this.paymentsService.findByAccountPayable(accountPayableId);
  }

  @Get('account-receivable/:id')
  findByAccountReceivable(@Param('id') accountReceivableId: string) {
    return this.paymentsService.findByAccountReceivable(accountReceivableId);
  }
}
