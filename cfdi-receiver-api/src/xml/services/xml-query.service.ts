import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { XmlRecibido } from '../entities/xml-recibido.entity';

@Injectable()
export class XmlQueryService {
  private readonly logger = new Logger(XmlQueryService.name);

  constructor(
    @InjectRepository(XmlRecibido)
    private xmlRepository: Repository<XmlRecibido>
  ) {}

  async buscarPorRfc(rfc: string, usuarioId: string, page = 1, limit = 10) {
    try {
      const [resultados, total] = await this.xmlRepository.findAndCount({
        where: {
          rfc_receptor: rfc,
          usuario_id: usuarioId
        },
        order: {
          fecha_recepcion: 'DESC'
        },
        skip: (page - 1) * limit,
        take: limit
      });

      return {
        data: resultados,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      this.logger.error(`Error buscando XMLs por RFC ${rfc}: ${error.message}`);
      throw error;
    }
  }

  async buscarPorPeriodo(
    fechaInicio: Date, 
    fechaFin: Date, 
    usuarioId: string,
    page = 1, 
    limit = 10
  ) {
    try {
      const [resultados, total] = await this.xmlRepository.findAndCount({
        where: {
          fecha_recepcion: Between(fechaInicio, fechaFin),
          usuario_id: usuarioId
        },
        order: {
          fecha_recepcion: 'DESC'
        },
        skip: (page - 1) * limit,
        take: limit
      });

      return {
        data: resultados,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      this.logger.error(`Error buscando XMLs por período: ${error.message}`);
      throw error;
    }
  }

  async obtenerResumen(usuarioId: string) {
    try {
      // Contar XMLs por RFC
      const conteoRfcs = await this.xmlRepository
        .createQueryBuilder('xml')
        .select('xml.rfc_receptor', 'rfc')
        .addSelect('COUNT(*)', 'cantidad')
        .where('xml.usuario_id = :usuarioId', { usuarioId })
        .groupBy('xml.rfc_receptor')
        .orderBy('cantidad', 'DESC')
        .getRawMany();

      // Contar XMLs por mes
      const conteoPorMes = await this.xmlRepository
        .createQueryBuilder('xml')
        .select("TO_CHAR(xml.fecha_recepcion, 'YYYY-MM')", 'mes')
        .addSelect('COUNT(*)', 'cantidad')
        .where('xml.usuario_id = :usuarioId', { usuarioId })
        .groupBy("TO_CHAR(xml.fecha_recepcion, 'YYYY-MM')")
        .orderBy('mes', 'DESC')
        .getRawMany();

      // Total general
      const total = await this.xmlRepository.count({
        where: { usuario_id: usuarioId }
      });

      return {
        total,
        porRfc: conteoRfcs,
        porMes: conteoPorMes
      };
    } catch (error) {
      this.logger.error(`Error obteniendo resumen: ${error.message}`);
      throw error;
    }
  }
}