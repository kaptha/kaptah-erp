import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { XmlRecibido } from './entities/xml-recibido.entity';  
import { ProcessXmlDto } from './dto/process-xml.dto';

@Injectable()
export class XmlService {
  constructor(
    @InjectRepository(XmlRecibido)  // ← Cambiar aquí
    private xmlRepository: Repository<XmlRecibido>  // ← Y aquí
  ) {}

  async processXml(dto: ProcessXmlDto, userId: string) {
    const xml = this.xmlRepository.create({
      xml_completo: dto.xmlContent,
      usuario_id: userId,
      fecha_recepcion: new Date(),
      estado_procesamiento: 'PENDIENTE',  // ← Agregar este campo
      // TODO: Extraer rfc_receptor del XML
    });

    return this.xmlRepository.save(xml);
  }
}