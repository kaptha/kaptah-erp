import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MainModule } from './main/main.module';
import { FiscalModule } from './fiscal/fiscal.module';
import { PostalModule } from './postal.module';
import { UnidadMedida } from './unidad/entities/unidad-medida.entity';
import { UnidadMedidaService } from './unidad/unidad-medida.service';
import { UnidadMedidaController } from './unidad/unidad-medida.controller';
import { ClaveProdServ } from './claves/entities/clave-prod-serv.entity';
import { ClaveProdServService } from './claves/clave-prod-serv.service';
import { ClaveProdServController } from './claves/clave-prod-serv.controller';
import { Moneda } from './moneda/entities/moneda.entity';
import { MonedaService } from './moneda/moneda.service';
import { MonedaController } from './moneda/moneda.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([UnidadMedida, ClaveProdServ, Moneda]),
    MainModule,
    FiscalModule,
    PostalModule
  ],
  controllers: [UnidadMedidaController, ClaveProdServController, MonedaController],
  providers: [UnidadMedidaService, ClaveProdServService, MonedaService],
  exports: [PostalModule, UnidadMedidaService, ClaveProdServService, MonedaService]
})
export class CatalogsModule {}
