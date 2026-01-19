import { Module } from '@nestjs/common';
import { SatCatalogService } from '../../services/sat-catalog/sat-catalog.service';

@Module({
  providers: [SatCatalogService],
  exports: [SatCatalogService]
})
export class SatCatalogModule {}
