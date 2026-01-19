import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class SucursalesService {
  constructor(
    @InjectDataSource('mysql')
    private mysqlDataSource: DataSource,
  ) {}

  /**
   * Obtiene una sucursal por su ID desde MySQL
   * @param sucursalId ID de la sucursal (string o number)
   * @returns Datos de la sucursal o null si no existe
   */
  async findById(sucursalId: string | number): Promise<any> {
    try {
      console.log('🔍 Consultando sucursal en MySQL con ID:', sucursalId);
      
      const id = typeof sucursalId === 'number' ? sucursalId.toString() : sucursalId;
      
      const result = await this.mysqlDataSource.query(
        'SELECT * FROM sucursales WHERE id = ?',
        [id]
      );

      if (!result || result.length === 0) {
        console.log('⚠️ Sucursal no encontrada con ID:', sucursalId);
        return null;
      }

      const sucursal = result[0];
      
      // ✨ Usar 'alias' en lugar de 'nombre'
      console.log('📋 Campos de la sucursal:', Object.keys(sucursal));
      console.log('📄 Datos completos de sucursal:', JSON.stringify(sucursal, null, 2));
      console.log('✅ Sucursal encontrada:', sucursal.alias || 'Sin alias');
      
      return sucursal;
    } catch (error) {
      console.error('❌ Error al consultar sucursal:', error);
      throw new NotFoundException(`Error al obtener sucursal con ID ${sucursalId}`);
    }
  }

  /**
   * Obtiene todas las sucursales
   * @returns Array de sucursales
   */
  async findAll(): Promise<any[]> {
    try {
      const result = await this.mysqlDataSource.query(
        'SELECT * FROM sucursales ORDER BY alias ASC' // ✨ Cambiar a 'alias'
      );

      return result || [];
    } catch (error) {
      console.error('❌ Error al obtener sucursales:', error);
      return [];
    }
  }

  /**
   * Obtiene una sucursal por su alias
   * @param alias Alias de la sucursal
   * @returns Datos de la sucursal o null
   */
  async findByAlias(alias: string): Promise<any> { // ✨ Cambiar nombre del método
    try {
      const result = await this.mysqlDataSource.query(
        'SELECT * FROM sucursales WHERE alias = ? LIMIT 1',
        [alias]
      );

      return result && result.length > 0 ? result[0] : null;
    } catch (error) {
      console.error('❌ Error al buscar sucursal por alias:', error);
      return null;
    }
  }
}
