import { Body, Controller, Get, Param, Post, Put, Delete, UseGuards } from '@nestjs/common';
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
@ApiTags('accounts-receivable')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('accounts-receivable')
export class AccountsReceivableController {
  constructor(
    private readonly accountsReceivableService: AccountsReceivableService,
    private readonly accountsReceivableIntegrationService: AccountsReceivableIntegrationService
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new account receivable' })
  create(@Body() createAccountReceivableDto: CreateAccountReceivableDto, @CurrentUser() user: any) {
    console.log('Creating account receivable for user:', user.uid);
    return this.accountsReceivableService.create(createAccountReceivableDto, user.uid);
  }

  @Get()
  @ApiOperation({ summary: 'Get all accounts receivable for the current user with client information' })
  findAll(@CurrentUser() user: any) {
    console.log('Finding accounts receivable for user:', user.uid);
    return this.accountsReceivableService.findAll(user.uid);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get accounts receivable summary with totals and client information' })
  getSummary(@CurrentUser() user: any) {
    console.log('Getting summary for user:', user.uid);
    return this.accountsReceivableService.getSummary(user.uid);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an account receivable by ID with client information' })
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.accountsReceivableService.findOne(id, user.uid);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an account receivable' })
  update(
    @Param('id') id: string,
    @Body() updateAccountReceivableDto: UpdateAccountReceivableDto,
    @CurrentUser() user: any
  ) {
    return this.accountsReceivableService.update(id, updateAccountReceivableDto, user.uid);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an account receivable' })
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.accountsReceivableService.remove(id, user.uid);
  }

  @Post(':id/payments')
  @ApiOperation({ summary: 'Register a payment for an account receivable' })
  registerPayment(
    @Param('id') id: string,
    @Body() paymentData: RegisterPaymentDto,
    @CurrentUser() user: any
  ) {
    return this.accountsReceivableService.registerPayment(id, paymentData, user.uid);
  }

  @Get('customer/:id/pending-documents')
  @ApiOperation({ summary: 'Get all pending documents for a customer' })
  @ApiParam({ name: 'id', description: 'Customer ID' })
  getCustomerPendingDocuments(@Param('id') customerId: string) {
    return this.accountsReceivableIntegrationService.getCustomerPendingDocuments(customerId);
  }

  @Post('from-document')
  @ApiOperation({ summary: 'Create an account receivable from a sales-api document' })
  createFromDocument(
    @Body() data: { 
      documentId: string; 
      documentType: 'cfdi' | 'saleNote'; 
      creditDays: number; 
    },
    @CurrentUser() user: any
  ) {
    return this.accountsReceivableIntegrationService.createAccountFromDocument(
      data.documentId,
      data.documentType,
      data.creditDays,
      user.uid
    );
  }
  @Post(':id/send-reminder')
@ApiOperation({ summary: 'Send payment reminder email to customer' })
async sendPaymentReminder(
  @Param('id') id: string,
  @Body() emailData: SendPaymentReminderDto,
  @CurrentUser() user: any,
) {
  return this.accountsReceivableService.sendPaymentReminder(
    id,
    emailData.recipientEmail,
    emailData.customMessage,
    user.uid,
  );
}

@Post('send-overdue-reminders')
@ApiOperation({ summary: 'Send payment reminders to all overdue accounts' })
async sendOverdueReminders(@CurrentUser() user: any) {
  return this.accountsReceivableService.sendOverdueReminders(user.uid);
}
}

