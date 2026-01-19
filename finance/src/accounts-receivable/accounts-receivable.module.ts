import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountsReceivableController } from './accounts-receivable.controller';
import { AccountsReceivableService } from './accounts-receivable.service';
import { Account } from '../shared/entities/account.entity';
import { Client } from '../shared/entities/client.entity';
import { PaymentsModule } from '../payments/payments.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { AccountsReceivableIntegrationService } from './services/accounts-receivable-integration.service';
import { EmailClientModule } from '../email-client/email-client.module';
@Module({
  imports: [
    TypeOrmModule.forFeature([Account]),
    TypeOrmModule.forFeature([Client], 'mysql'),
    PaymentsModule,
    IntegrationsModule,
    EmailClientModule,
  ],
  controllers: [AccountsReceivableController],
  providers: [
    AccountsReceivableService,
    AccountsReceivableIntegrationService,
  ],
  exports: [AccountsReceivableService],
})
export class AccountsReceivableModule {}


