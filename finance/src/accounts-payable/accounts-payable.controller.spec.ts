import { Test, TestingModule } from '@nestjs/testing';
import { AccountsPayableController } from './accounts-payable.controller';

describe('AccountsPayableController', () => {
  let controller: AccountsPayableController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AccountsPayableController],
    }).compile();

    controller = module.get<AccountsPayableController>(AccountsPayableController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
