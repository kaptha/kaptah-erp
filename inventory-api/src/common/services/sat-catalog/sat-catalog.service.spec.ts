import { Test, TestingModule } from '@nestjs/testing';
import { SatCatalogService } from './sat-catalog.service';

describe('SatCatalogService', () => {
  let service: SatCatalogService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SatCatalogService],
    }).compile();

    service = module.get<SatCatalogService>(SatCatalogService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
