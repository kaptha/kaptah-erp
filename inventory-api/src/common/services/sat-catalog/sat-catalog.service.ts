import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class SatCatalogService {
  private readonly apiUrl = 'http://localhost:3002'; // Ajusta este puerto según tu configuración de sat-cat-api

  // Buscar claves de productos/servicios
  async searchProductServiceKey(term: string) {
    try {
      const response = await axios.get(`${this.apiUrl}/clave-prod-serv/buscar`, {
        params: { termino: term }
      });
      return response.data;
    } catch (error) {
      throw new HttpException(
        'Error al buscar clave SAT',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // Buscar unidades de medida
  async searchMeasurementUnit(term: string) {
    try {
      const response = await axios.get(`${this.apiUrl}/unidad-medida/buscar`, {
        params: { termino: term }
      });
      return response.data;
    } catch (error) {
      throw new HttpException(
        'Error al buscar unidad de medida',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // Obtener todas las claves
  async getAllProductServiceKeys() {
    try {
      const response = await axios.get(`${this.apiUrl}/clave-prod-serv`);
      return response.data;
    } catch (error) {
      throw new HttpException(
        'Error al obtener claves SAT',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // Obtener todas las unidades
  async getAllMeasurementUnits() {
    try {
      const response = await axios.get(`${this.apiUrl}/unidad-medida`);
      return response.data;
    } catch (error) {
      throw new HttpException(
        'Error al obtener unidades de medida',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // Validar clave SAT
  async validateProductServiceKey(key: string): Promise<boolean> {
    try {
      const results = await this.searchProductServiceKey(key);
      return results.some((item: any) => item.clave === key);
    } catch {
      return false;
    }
  }

  // Validar unidad de medida
  async validateMeasurementUnit(unit: string): Promise<boolean> {
    try {
      const results = await this.searchMeasurementUnit(unit);
      return results.some((item: any) => item.clave === unit);
    } catch {
      return false;
    }
  }
}
