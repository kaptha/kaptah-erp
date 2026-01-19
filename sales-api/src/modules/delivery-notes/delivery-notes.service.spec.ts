import { Test, TestingModule } from '@nestjs/testing';
import { DeliveryNotesService } from './delivery-notes.service';

describe('DeliveryNotesService', () => {
  let service: DeliveryNotesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DeliveryNotesService],
    }).compile();

    service = module.get<DeliveryNotesService>(DeliveryNotesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
