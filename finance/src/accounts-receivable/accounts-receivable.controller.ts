import { Body, Controller, Get, Param, Post, Put, Delete, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam } from '@nestjs/swagger';
import { AccountsReceivableService } from './accounts-receivable.service';
import { AccountsReceivableIntegrationService } from './services/accounts-receivable-integration.service';
import { CreateAccountReceivableDto } from './dto/create-account-receivable.dto/create-account-receivable.dto';
import { UpdateAccountReceivableDto } from './dto/create-account-receivable.dto/update-account-receivable.dto';
import { CreatePaymentDto } from '../payments/dto/create-payment.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RegisterPaymentDto } from './dto/register-payment.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SendPaymentReminderDto } from '../email-client/dto/send-payment-reminder.dto';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';

@ApiTags('accounts-receivable')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('accounts-receivable')
export class AccountsReceivableController {
  constructor(
    private readonly accountsReceivableService: AccountsReceivableService,
    private readonly accountsReceivableIntegrationService: AccountsReceivableIntegrationService
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new account receivable' })
  @RequirePermission('cuentas_cobrar.crear')
  create(@Body() createAccountReceivableDto: CreateAccountReceivableDto, @CurrentUser() user: any, @Query('cuentaUid') cuentaUid?: string) {
    const userId = cuentaUid || user.uid;
    console.log('Creating account receivable for user:', userId);
    return this.accountsReceivableService.create(createAccountReceivableDto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all accounts receivable for the current user with client information' })
  findAll(@CurrentUser() user: any, @Query('cuentaUid') cuentaUid?: string) {
    const userId = cuentaUid || user.uid;
    console.log('Finding accounts receivable for user:', userId);
    return this.accountsReceivableService.findAll(userId);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get accounts receivable summary with totals and client information' })
  getSummary(@CurrentUser() user: any, @Query('cuentaUid') cuentaUid?: string) {
    const userId = cuentaUid || user.uid;
    console.log('Getting summary for user:', userId);
    return this.accountsReceivableService.getSummary(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an account receivable by ID with client information' })
  findOne(@Param('id') id: string, @CurrentUser() user: any, @Query('cuentaUid') cuentaUid?: string) {
    const userId = cuentaUid || user.uid;
    return this.accountsReceivableService.findOne(id, userId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an account receivable' })
  @RequirePermission('cuentas_cobrar.editar')
  update(
    @Param('id') id: string,
    @Body() updateAccountReceivableDto: UpdateAccountReceivableDto,
    @CurrentUser() user: any,
    @Query('cuentaUid') cuentaUid?: string,
  ) {
    const userId = cuentaUid || user.uid;
    return this.accountsReceivableService.update(id, updateAccountReceivableDto, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an account receivable' })
  @RequirePermission('cuentas_cobrar.eliminar')
  remove(@Param('id') id: string, @CurrentUser() user: any, @Query('cuentaUid') cuentaUid?: string) {
    const userId = cuentaUid || user.uid;
    return this.accountsReceivableService.remove(id, userId);
  }

  @Post(':id/payments')
  @ApiOperation({ summary: 'Register a payment for an account receivable' })
  @RequirePermission('cuentas_cobrar.editar')
  registerPayment(
    @Param('id') id: string,
    @Body() paymentData: RegisterPaymentDto,
    @CurrentUser() user: any,
    @Query('cuentaUid') cuentaUid?: string,
  ) {
    const userId = cuentaUid || user.uid;
    return this.accountsReceivableService.registerPayment(id, paymentData, userId);
  }

  @Get('customer/:id/pending-documents')
  @ApiOperation({ summary: 'Get all pending documents for a customer' })
  @ApiParam({ name: 'id', description: 'Customer ID' })
  getCustomerPendingDocuments(@Param('id') customerId: string) {
    return this.accountsReceivableIntegrationService.getCustomerPendingDocuments(customerId);
  }

  @Post('from-document')
  @ApiOperation({ summary: 'Create an account receivable from a sales-api document' })
  @RequirePermission('cuentas_cobrar.crear')
  createFromDocument(
    @Body() data: {
      documentId: string;
      documentType: 'cfdi' | 'saleNote';
      creditDays: number;
    },
    @CurrentUser() user: any,
    @Query('cuentaUid') cuentaUid?: string,
  ) {
    const userId = cuentaUid || user.uid;
    return this.accountsReceivableIntegrationService.createAccountFromDocument(
      data.documentId,
      data.documentType,
      data.creditDays,
      userId
    );
  }

  @Post(':id/send-reminder')
  @ApiOperation({ summary: 'Send payment reminder email to customer' })
  @RequirePermission('cuentas_cobrar.editar')
  async sendPaymentReminder(
    @Param('id') id: string,
    @Body() emailData: SendPaymentReminderDto,
    @CurrentUser() user: any,
    @Query('cuentaUid') cuentaUid?: string,
  ) {
    const userId = cuentaUid || user.uid;
    return this.accountsReceivableService.sendPaymentReminder(
      id,
      emailData.recipientEmail,
      emailData.customMessage,
      userId,
    );
  }

  @Post('send-overdue-reminders')
  @ApiOperation({ summary: 'Send payment reminders to all overdue accounts' })
  @RequirePermission('cuentas_cobrar.editar')
  async sendOverdueReminders(@CurrentUser() user: any, @Query('cuentaUid') cuentaUid?: string) {
    const userId = cuentaUid || user.uid;
    return this.accountsReceivableService.sendOverdueReminders(userId);
  }
}