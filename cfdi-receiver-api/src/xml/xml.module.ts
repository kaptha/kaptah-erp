import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { XmlImportController } from './controllers/xml-import.controller';
import { XmlImportService } from './services/xml-import.service';
import { XmlQueryController } from './controllers/xml-query.controller';
import { XmlQueryService } from './services/xml-query.service';
import { XmlFinancieroController } from './controllers/xml-financiero.controller';  
import { XmlFinancieroService } from './services/xml-financiero.service';          
import { XmlParserService } from './services/xml-parser.service';                  
import { XmlRecibido } from './entities/xml-recibido.entity';
import { XmlFinanciero } from './entities/xml-financiero.entity';                  
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([XmlRecibido, XmlFinanciero]), 
    AuthModule
  ],
  controllers: [
    XmlImportController, 
    XmlQueryController,
    XmlFinancieroController  
  ],
  providers: [
    XmlImportService, 
    XmlQueryService,
    XmlParserService,        
    XmlFinancieroService     
  ],
  exports: [XmlImportService, XmlQueryService, XmlFinancieroService]  
})
export class XmlModule {}