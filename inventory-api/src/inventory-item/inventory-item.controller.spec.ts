import { Test, TestingModule } from '@nestjs/testing';
import { InventoryItemController } from './inventory-item.controller';

describe('InventoryItemController', () => {
  let controller: InventoryItemController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InventoryItemController],
    }).compile();

    controller = module.get<InventoryItemController>(InventoryItemController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
