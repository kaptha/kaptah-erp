import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Postal } from './postal/entities/postal.entity';
import { Colonia } from './postal/entities/colonia.entity';

@Injectable()
export class PostalService {
  constructor(
    @InjectRepository(Postal)
    private postalRepository: Repository<Postal>,
    @InjectRepository(Colonia)
    private coloniaRepository: Repository<Colonia>,
  ) {}

  async buscarCodigosPostales(prefijo: string): Promise<Postal[]> {
    console.log('Iniciando búsqueda para prefijo:', prefijo);
    try {
      const resultado = await this.postalRepository.createQueryBuilder('postal')
        .where('postal.codigo LIKE :prefijo', { prefijo: `${prefijo}%` })
        .orderBy('postal.codigo', 'ASC')
        .limit(10)
        .getMany();
      console.log('Consulta completada, número de resultados:', resultado.length);
      return resultado;
    } catch (error) {
      console.error('Error en la consulta:', error);
      throw error;
    }
  }

  async buscarColonias(codigoPostal: string): Promise<string[]> {
    const colonias = await this.coloniaRepository.find({
      where: { codigoPostal },
      order: { nombre: 'ASC' },
      select: ['nombre']
    });
    return colonias.map(colonia => colonia.nombre);
  }
}
