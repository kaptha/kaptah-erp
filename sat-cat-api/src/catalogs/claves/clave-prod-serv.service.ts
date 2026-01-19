import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClaveProdServ } from './entities/clave-prod-serv.entity';

@Injectable()
export class ClaveProdServService {
  constructor(
    @InjectRepository(ClaveProdServ)
    private claveProdServRepository: Repository<ClaveProdServ>,
  ) {}

  async buscarClaveProdServ(termino: string): Promise<ClaveProdServ[]> {
    return this.claveProdServRepository.query(
      'SELECT * FROM buscar_clave_prod_serv($1)',
      [termino]
    );
  }

  async obtenerTodas(): Promise<ClaveProdServ[]> {
    return this.claveProdServRepository.find();
  }
}