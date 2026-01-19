import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Moneda } from './entities/moneda.entity';

@Injectable()
export class MonedaService {
  constructor(
    @InjectRepository(Moneda)
    private monedaRepository: Repository<Moneda>,
  ) {}

  async buscarMoneda(termino: string): Promise<Moneda[]> {
    try {
      return await this.monedaRepository.query(
        'SELECT * FROM buscar_moneda($1)',
        [termino]
      );
    } catch (error) {
      console.error('Error en buscarMoneda:', error);
      throw error;
    }
  }

  async obtenerTodas(): Promise<Moneda[]> {
    return this.monedaRepository.find();
  }
}