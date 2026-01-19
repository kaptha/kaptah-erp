import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UnidadMedida } from './entities/unidad-medida.entity';

@Injectable()
export class UnidadMedidaService {
  constructor(
    @InjectRepository(UnidadMedida)
    private unidadMedidaRepository: Repository<UnidadMedida>,
  ) {}

  async buscarUnidadMedida(termino: string): Promise<UnidadMedida[]> {
    return this.unidadMedidaRepository.query(
      'SELECT * FROM buscar_unidad_medida($1)',
      [termino]
    );
  }

  async obtenerTodas(): Promise<UnidadMedida[]> {
    return this.unidadMedidaRepository.find();
  }
}