import { Body, Controller, Get, Param, Post, Put, Req, Delete, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AccountsPayableService } from './accounts-payable.service';
import { CreateAccountPayableDto } from './dto/create-account-payable.dto/create-account-payable.dto';
import { UpdateAccountPayableDto } from './dto/create-account-payable.dto/update-account-payable.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RegisterPaymentDto } from './dto/register-payment.dto';
import { SendPaymentReminderDto } from '../email-client/dto/send-payment-reminder.dto';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';

@ApiTags('accounts-payable')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('accounts-payable')
export class AccountsPayableController {
  constructor(private readonly accountsPayableService: AccountsPayableService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new account payable' })
  @RequirePermission('cuentas_pagar.crear')
  create(@Body() createAccountPayableDto: CreateAccountPayableDto, @Req() req, @Query('cuentaUid') cuentaUid?: string) {
    const userId = cuentaUid || req.user?.id || req.user?.uid;
    console.log('Creating account payable for user:', userId);
    return this.accountsPayableService.create(createAccountPayableDto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all accounts payable for the current user' })
  findAll(@Req() req, @Query('cuentaUid') cuentaUid?: string) {
    const userId = cuentaUid || req.user?.id || req.user?.uid;
    console.log('Finding accounts payable for user:', userId);
    return this.accountsPayableService.findAll(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an account payable by ID' })
  findOne(@Param('id') id: string, @Req() req, @Query('cuentaUid') cuentaUid?: string) {
    const userId = cuentaUid || req.user?.id || req.user?.uid;
    return this.accountsPayableService.findOne(id, userId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an account payable' })
  @RequirePermission('cuentas_pagar.editar')
  update(
    @Param('id') id: string,
    @Body() updateAccountPayableDto: UpdateAccountPayableDto,
    @Req() req,
    @Query('cuentaUid') cuentaUid?: string,
  ) {
    const userId = cuentaUid || req.user?.id || req.user?.uid;
    return this.accountsPayableService.update(id, updateAccountPayableDto, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an account payable' })
  @RequirePermission('cuentas_pagar.eliminar')
  remove(@Param('id') id: string, @Req() req, @Query('cuentaUid') cuentaUid?: string) {
    const userId = cuentaUid || req.user?.id || req.user?.uid;
    return this.accountsPayableService.remove(id, userId);
  }

  @Post(':id/payments')
  @ApiOperation({ summary: 'Register a payment for an account payable' })
  @RequirePermission('cuentas_pagar.editar')
  registerPayment(
    @Param('id') id: string,
    @Body() paymentData: RegisterPaymentDto,
    @Req() req,
    @Query('cuentaUid') cuentaUid?: string,
  ) {
    const userId = cuentaUid || req.user?.id || req.user?.uid;
    return this.accountsPayableService.registerPayment(id, paymentData, userId);
  }

  @Post(':id/send-notice')
  @ApiOperation({ summary: 'Send payment notice email' })
  async sendPaymentNotice(
    @Param('id') id: string,
    @Body() emailData: SendPaymentReminderDto,
    @Req() req,
    @Query('cuentaUid') cuentaUid?: string,
  ) {
    const userId = cuentaUid || req.user?.id || req.user?.uid;
    return this.accountsPayableService.sendPaymentNotice(
      id,
      emailData.recipientEmail,
      emailData.customMessage,
      userId,
    );
  }
}