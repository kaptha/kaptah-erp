import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { TimbradoResponse, Timbrado } from './interface/timbrado.interface';
import { ConfigService } from '@nestjs/config';
//import * as SifeiSoap from '../../shared/helpers/sifei-soap.helper';
//import { CreateTimbradoDto } from './dto/create-timbrado.dto';
//import { CancelTimbradoDto } from './dto/cancel-timbrado.dto';

@Injectable()
export class TimbradoService {
  constructor(private databaseService: DatabaseService, private configService: ConfigService) {}
 
  
  
  //async createTimbrado(createTimbradoDto: CreateTimbradoDto) {
    // Implementa la lógica para crear un timbrado
    // Esto podría incluir la comunicación con el servicio de timbrado (SIFEI)
  //}

  //async cancelTimbrado(cancelTimbradoDto: CancelTimbradoDto) {
    // Implementa la lógica para cancelar un timbrado
  //}
  async timbrar(xml: string): Promise<TimbradoResponse> {
    try {
      // Aquí iría la lógica de conexión con SIFEI
      // Por ahora simulamos la respuesta
      const timbradoResponse: TimbradoResponse = {
        uuid: `TEST-${Date.now()}`,
        status: 'ACTIVE',
        xml: xml, // El XML timbrado (en producción sería el que devuelve SIFEI)
        fechaTimbrado: new Date().toISOString(),
        cadenaOriginal: `||4.0|${Date.now()}|...||`, // Simulada
        selloCFD: 'MDk5OTk5OTk5OTk=', // Simulado
        selloSAT: 'MTExMTExMTExMTE=', // Simulado
        noCertificadoSAT: '30001000000400002434' // Simulado
      };

      // Guardar el timbrado en la base de datos
      await this.saveTimbrado({
        uuid: timbradoResponse.uuid,
        xml: timbradoResponse.xml,
        fechaTimbrado: timbradoResponse.fechaTimbrado,
        status: timbradoResponse.status,
        selloCFD: timbradoResponse.selloCFD,
        selloSAT: timbradoResponse.selloSAT,
        noCertificadoSAT: timbradoResponse.noCertificadoSAT,
        cadenaOriginal: timbradoResponse.cadenaOriginal
      });

      return timbradoResponse;
    } catch (error) {
      throw new Error(`Error en el timbrado: ${error.message}`);
    }
  }
  private async saveTimbrado(timbrado: Partial<Timbrado>): Promise<Timbrado> {
    try {
      const result = await this.databaseService.runQuery(
        `INSERT INTO timbrados (
          uuid,
          xml,
          fecha_timbrado,
          status,
          sello_cfd,
          sello_sat,
          no_certificado_sat,
          cadena_original,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          timbrado.uuid,
          timbrado.xml,
          timbrado.fechaTimbrado,
          timbrado.status,
          timbrado.selloCFD,
          timbrado.selloSAT,
          timbrado.noCertificadoSAT,
          timbrado.cadenaOriginal
        ]
      );
      return result[0];
    } catch (error) {
      throw new Error(`Error al guardar timbrado: ${error.message}`);
    }
  }

  async findAll(): Promise<Timbrado[]> {
    try {
      const result = await this.databaseService.runQuery(
        'SELECT * FROM timbrados ORDER BY fecha_timbrado DESC'
      );
      return result;
    } catch (error) {
      throw new Error(`Error al obtener timbrados: ${error.message}`);
    }
  }

  async findByDateRange(startDate: Date, endDate: Date): Promise<Timbrado[]> {
    try {
      const result = await this.databaseService.runQuery(
        'SELECT * FROM timbrados WHERE fecha_timbrado BETWEEN ? AND ? ORDER BY fecha_timbrado DESC',
        [startDate, endDate]
      );
      return result;
    } catch (error) {
      throw new Error(`Error al obtener timbrados por rango de fecha: ${error.message}`);
    }
  }

  async findById(id: string): Promise<Timbrado> {
    try {
      const result = await this.databaseService.runQuery(
        'SELECT * FROM timbrados WHERE id = ?',
        [id]
      );
      
      if (!result.length) {
        throw new Error(`Timbrado con ID ${id} no encontrado`);
      }
      
      return result[0];
    } catch (error) {
      throw new Error(`Error al obtener timbrado: ${error.message}`);
    }
  }

  async cancelar(uuid: string, motivo: string): Promise<TimbradoResponse> {
    try {
      // Aquí iría la lógica de cancelación con SIFEI
      // Por ahora actualizamos el estado en la base de datos
      await this.databaseService.runQuery(
        `UPDATE timbrados 
         SET status = 'CANCELLED', 
             motivo_cancelacion = ?, 
             cancelado_at = NOW() 
         WHERE uuid = ?`,
        [motivo, uuid]
      );

      // Retornar la respuesta actualizada
      const result = await this.findByUuid(uuid);
      return {
        uuid: result.uuid,
        status: 'CANCELLED',
        xml: result.xml,
        fechaTimbrado: result.fechaTimbrado,
        cadenaOriginal: result.cadenaOriginal,
        selloCFD: result.selloCFD,
        selloSAT: result.selloSAT,
        noCertificadoSAT: result.noCertificadoSAT
      };
    } catch (error) {
      throw new Error(`Error al cancelar timbrado: ${error.message}`);
    }
  }

  private async findByUuid(uuid: string): Promise<Timbrado> {
    const result = await this.databaseService.runQuery(
      'SELECT * FROM timbrados WHERE uuid = ?',
      [uuid]
    );
    
    if (!result.length) {
      throw new Error(`Timbrado con UUID ${uuid} no encontrado`);
    }
    
    return result[0];
  }
}
