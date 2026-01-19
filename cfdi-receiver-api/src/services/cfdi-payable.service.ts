import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { XmlRecibido } from '../xml/entities/xml-recibido.entity'; // Usar tu entidad existente

@Injectable()
export class CfdiPayableService {
  constructor(
    @InjectRepository(XmlRecibido)
    private readonly xmlRecibidoRepository: Repository<XmlRecibido>
  ) {}

  async findByUserId(userId: string) { // ✅ Cambiar a string
  console.log('Buscando CFDIs para usuario:', userId);
  
  const cfdis = await this.xmlRecibidoRepository.find({
    where: { usuario_id: userId }, // ✅ Ya es string
    order: { fecha_recepcion: 'DESC' }
  });
  
  return cfdis;
}

async findByUserIdAndProviderRfc(userId: string, providerRfc: string) {
  console.log('🔍 Buscando CFDIs - userId:', userId, 'RFC:', providerRfc);
  
  // Temporal: buscar SOLO por RFC para ver si hay datos
  const cfdis = await this.xmlRecibidoRepository.find({
    where: { 
      rfc_receptor: providerRfc  // Solo buscar por RFC temporalmente
    },
    order: { fecha_recepcion: 'DESC' }
  });
  
  console.log('✅ CFDIs encontrados (sin filtro usuario):', cfdis.length);
  if (cfdis.length > 0) {
    console.log('Usuario_ids encontrados:', cfdis.map(c => c.usuario_id));
  }
  return cfdis;
}

  async findPendingByUserId(userId: string) {  // ✅ Cambiar a string
  console.log('Buscando CFDIs pendientes para usuario:', userId);
  
  const cfdis = await this.xmlRecibidoRepository.find({
    where: { 
      usuario_id: userId,  // ✅ Ahora coincide con string
      estado_procesamiento: 'IMPORTADO'
    },
    order: { fecha_recepcion: 'DESC' }
  });
  
  console.log('CFDIs pendientes encontrados:', cfdis.length);
  return cfdis;
}

  async findAvailableForPayable(userId: string) {  // ✅ Cambiar a string
  console.log('Buscando CFDIs disponibles para cuentas por pagar, usuario:', userId);
  
  const queryBuilder = this.xmlRecibidoRepository.createQueryBuilder('cfdi')
    .where('cfdi.usuario_id = :userId', { userId })
    .andWhere('cfdi.estado_procesamiento IN (:...estados)', { 
      estados: ['IMPORTADO', 'PROCESADO'] 
    });
  
  const cfdis = await queryBuilder
    .orderBy('cfdi.fecha_recepcion', 'DESC')
    .getMany();
  
  console.log('CFDIs disponibles encontrados:', cfdis.length);
  return cfdis;
}

async searchCfdis(userId: string, criteria: {  // ✅ Cambiar a string
  rfcEmisor?: string;
  fechaInicio?: string;
  fechaFin?: string;
  estado?: string;
  montoMinimo?: number;
  montoMaximo?: number;
}) {
  console.log('Buscando CFDIs con criterios:', criteria);
  
  const qb = this.xmlRecibidoRepository.createQueryBuilder('cfdi')
    .where('cfdi.usuario_id = :userId', { userId });

  if (criteria.rfcEmisor) {
    qb.andWhere('cfdi.rfc_emisor = :rfcEmisor', { rfcEmisor: criteria.rfcEmisor });  // ✅ Cambiar a rfc_emisor
  }

  if (criteria.fechaInicio) {
    qb.andWhere('cfdi.fecha_recepcion >= :fechaInicio', { fechaInicio: criteria.fechaInicio });
  }

  if (criteria.fechaFin) {
    qb.andWhere('cfdi.fecha_recepcion <= :fechaFin', { fechaFin: criteria.fechaFin });
  }

  if (criteria.estado) {
    qb.andWhere('cfdi.estado_procesamiento = :estado', { estado: criteria.estado });
  }

  const cfdis = await qb.orderBy('cfdi.fecha_recepcion', 'DESC').getMany();
  console.log('CFDIs encontrados con búsqueda:', cfdis.length);
  
  return cfdis;
}

  
  async findById(id: number) {
    console.log('Buscando CFDI por ID:', id);
    
    const cfdi = await this.xmlRecibidoRepository.findOne({
      where: { id }
    });

    if (!cfdi) {
      throw new NotFoundException(`CFDI con ID ${id} no encontrado`);
    }

    return cfdi;
  }

  async markAsUsed(cfdiId: number, accountPayableId: string) {
    console.log('Marcando CFDI como usado:', cfdiId, 'en cuenta:', accountPayableId);
    
    // Si tu entidad tiene campos para rastrear esto, actualizar aquí
    const result = await this.xmlRecibidoRepository.update(cfdiId, { 
      // account_payable_id: accountPayableId,
      estado_procesamiento: 'USADO'
    });

    if (result.affected === 0) {
      throw new NotFoundException(`CFDI con ID ${cfdiId} no encontrado`);
    }

    return { message: 'CFDI marcado como usado correctamente' };
  }
}