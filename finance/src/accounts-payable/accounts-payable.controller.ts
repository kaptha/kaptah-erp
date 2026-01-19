import { Body, Controller, Get, Param, Post, Put, Req, Delete, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AccountsPayableService } from './accounts-payable.service';
import { CreateAccountPayableDto } from './dto/create-account-payable.dto/create-account-payable.dto';
import { UpdateAccountPayableDto } from './dto/create-account-payable.dto/update-account-payable.dto';
import { CreatePaymentDto } from '../payments/dto/create-payment.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RegisterPaymentDto } from './dto/register-payment.dto';
import { SendPaymentReminderDto } from '../email-client/dto/send-payment-reminder.dto';
@ApiTags('accounts-payable')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('accounts-payable')
export class AccountsPayableController {
  constructor(private readonly accountsPayableService: AccountsPayableService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new account payable' })
  create(@Body() createAccountPayableDto: CreateAccountPayableDto, @Req() req) {
    // Usar el UUID válido que configuramos en los archivos de auth
    const userId = req.user?.id || req.user?.uid || '550e8400-e29b-41d4-a716-446655440000';
    console.log('Creating account payable for user:', userId); // Para debugging
    return this.accountsPayableService.create(createAccountPayableDto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all accounts payable for the current user' })
  findAll(@Req() req) {
    const userId = req.user?.id || req.user?.uid || '550e8400-e29b-41d4-a716-446655440000';
    console.log('Finding accounts payable for user:', userId); // Para debugging
    return this.accountsPayableService.findAll(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an account payable by ID' })
  findOne(@Param('id') id: string, @Req() req) {
    const userId = req.user?.id || req.user?.uid || '550e8400-e29b-41d4-a716-446655440000';
    return this.accountsPayableService.findOne(id, userId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an account payable' })
  update(
    @Param('id') id: string,
    @Body() updateAccountPayableDto: UpdateAccountPayableDto,
    @Req() req
  ) {
    const userId = req.user?.id || req.user?.uid || '550e8400-e29b-41d4-a716-446655440000';
    return this.accountsPayableService.update(id, updateAccountPayableDto, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an account payable' })
  remove(@Param('id') id: string, @Req() req) {
    const userId = req.user?.id || req.user?.uid || '550e8400-e29b-41d4-a716-446655440000';
    return this.accountsPayableService.remove(id, userId);
  }

  @Post(':id/payments')
  @ApiOperation({ summary: 'Register a payment for an account payable' })
  registerPayment(
    @Param('id') id: string,
    @Body() paymentData: RegisterPaymentDto,
    @Req() req
  ) {
    const userId = req.user?.id || req.user?.uid || '550e8400-e29b-41d4-a716-446655440000';
    return this.accountsPayableService.registerPayment(id, paymentData, userId);
  }
  @Post(':id/send-notice')
@ApiOperation({ summary: 'Send payment notice email' })
async sendPaymentNotice(
  @Param('id') id: string,
  @Body() emailData: SendPaymentReminderDto,
  @Req() req,
) {
  const userId = req.user?.id || req.user?.uid || '550e8400-e29b-41d4-a716-446655440000';
  return this.accountsPayableService.sendPaymentNotice(
    id,
    emailData.recipientEmail,
    emailData.customMessage,
    userId,
  );
}
}
