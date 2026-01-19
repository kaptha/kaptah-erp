import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountsPayableController } from './accounts-payable.controller';
import { AccountsPayableService } from './accounts-payable.service';
import { Account } from '../shared/entities/account.entity';
import { PaymentsModule } from '../payments/payments.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { EmailClientModule } from '../email-client/email-client.module';
@Module({
  imports: [
    TypeOrmModule.forFeature([Account]),
    PaymentsModule,
    IntegrationsModule,
    EmailClientModule,
  ],
  controllers: [AccountsPayableController],
  providers: [AccountsPayableService],
  exports: [AccountsPayableService],
})
export class AccountsPayableModule {}
