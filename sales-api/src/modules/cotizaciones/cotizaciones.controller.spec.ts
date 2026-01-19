import { Test, TestingModule } from '@nestjs/testing';
import { CotizacionesController } from './cotizaciones.controller';

describe('CotizacionesController', () => {
  let controller: CotizacionesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CotizacionesController],
    }).compile();

    controller = module.get<CotizacionesController>(CotizacionesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
