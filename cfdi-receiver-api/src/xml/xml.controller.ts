import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { XmlService } from './xml.service';
import { XmlImportService } from './services/xml-import.service';  // ✅ Importar
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProcessXmlDto } from './dto/process-xml.dto';

@Controller('xml')
@UseGuards(JwtAuthGuard)
export class XmlController {
  constructor(
    private readonly xmlService: XmlService,
    private readonly xmlImportService: XmlImportService  // ✅ Inyectar
  ) {}

  @Post('process')
  async processXml(@Body() dto: ProcessXmlDto, @Request() req) {
    const firebaseUid = req.user.firebaseUid || req.user.sub || 'TEMPORAL_UID';
    return this.xmlService.processXml(dto, firebaseUid);
  }

  
}