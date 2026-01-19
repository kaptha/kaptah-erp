import { Test, TestingModule } from '@nestjs/testing';
import { DeliveryNotesController } from './delivery-notes.controller';

describe('DeliveryNotesController', () => {
  let controller: DeliveryNotesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DeliveryNotesController],
    }).compile();

    controller = module.get<DeliveryNotesController>(DeliveryNotesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
