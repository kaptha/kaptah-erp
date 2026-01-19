import { Test, TestingModule } from '@nestjs/testing';
import { SaleNotesService } from './sale-notes.service';

describe('SaleNotesService', () => {
  let service: SaleNotesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SaleNotesService],
    }).compile();

    service = module.get<SaleNotesService>(SaleNotesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
