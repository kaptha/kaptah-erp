import { Test, TestingModule } from '@nestjs/testing';
import { SaleNotesController } from './sale-notes.controller';

describe('SaleNotesController', () => {
  let controller: SaleNotesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SaleNotesController],
    }).compile();

    controller = module.get<SaleNotesController>(SaleNotesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
