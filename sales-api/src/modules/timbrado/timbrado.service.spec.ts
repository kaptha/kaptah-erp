import { Test, TestingModule } from '@nestjs/testing';
import { TimbradoService } from './timbrado.service';

describe('TimbradoService', () => {
  let service: TimbradoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TimbradoService],
    }).compile();

    service = module.get<TimbradoService>(TimbradoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
