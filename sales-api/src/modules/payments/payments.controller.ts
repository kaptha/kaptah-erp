import { Controller, Get, Post, Body, Put, Param, Delete, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';

@ApiTags('Payments')
@ApiBearerAuth()
@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @ApiOperation({ summary: 'Crear un pago' })
  create(@Body() createPaymentDto: CreatePaymentDto, @CurrentUser() user: any) {
    return this.paymentsService.create(createPaymentDto, user.uid);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todos los pagos' })
  findAll(@CurrentUser() user: any) {
    return this.paymentsService.findAll(user.uid);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un pago por ID' })
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.paymentsService.findOne(id, user.uid);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar un pago' })
  update(
    @Param('id') id: string,
    @Body() updatePaymentDto: UpdatePaymentDto,
    @CurrentUser() user: any
  ) {
    return this.paymentsService.update(id, updatePaymentDto, user.uid);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar un pago' })
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.paymentsService.remove(id, user.uid);
  }
}
