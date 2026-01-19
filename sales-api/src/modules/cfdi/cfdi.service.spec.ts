import { Test, TestingModule } from '@nestjs/testing';
import { CfdiService } from './cfdi.service';

describe('CfdiService', () => {
  let service: CfdiService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CfdiService],
    }).compile();

    service = module.get<CfdiService>(CfdiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
