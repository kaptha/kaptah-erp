import { Test, TestingModule } from '@nestjs/testing';
import { CotizacionesService } from './cotizaciones.service';

describe('CotizacionesService', () => {
  let service: CotizacionesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CotizacionesService],
    }).compile();

    service = module.get<CotizacionesService>(CotizacionesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
