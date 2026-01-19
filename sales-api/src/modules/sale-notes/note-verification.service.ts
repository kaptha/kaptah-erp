import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SaleNote } from './entities/sale-note.entity';

@Injectable()
export class NoteVerificationService {
  private readonly logger = new Logger(NoteVerificationService.name);

  constructor(
    @InjectRepository(SaleNote)
    private readonly saleNoteRepository: Repository<SaleNote>,
  ) {}

  /**
   * Decodifica el hash de verificación
   */
  private decodeVerificationHash(hash: string): {
    folio: string;
    fecha: string;
    rfcEmisor: string;
    total: number;
  } {
    try {
      const decoded = Buffer.from(hash, 'base64url').toString('utf-8');
      const [folio, fecha, rfcEmisor, total] = decoded.split('|');

      if (!folio || !fecha || !rfcEmisor || !total) {
        throw new Error('Hash de verificación inválido');
      }

      return {
        folio,
        fecha,
        rfcEmisor,
        total: parseFloat(total)
      };
    } catch (error) {
      this.logger.error('❌ Error decodificando hash:', error);
      throw new BadRequestException('Código de verificación inválido');
    }
  }

  /**
   * Verifica una nota de venta usando el hash del QR
   */
  async verifyNoteByHash(hash: string) {
    try {
      this.logger.log(`🔍 Verificando nota con hash: ${hash.substring(0, 20)}...`);

      // 1. Decodificar el hash
      const decodedData = this.decodeVerificationHash(hash);

      // 2. Buscar la nota en la base de datos
      const note = await this.saleNoteRepository.findOne({
        where: {
          folio: decodedData.folio,
        },
        relations: ['items'], // Ajusta según tus relaciones
      });

      if (!note) {
        this.logger.warn(`⚠️ Nota no encontrada: ${decodedData.folio}`);
        throw new NotFoundException('Nota de venta no encontrada');
      }

      // 3. Verificar integridad de los datos
      const isValid = this.validateNoteData(note, decodedData);

      if (!isValid) {
        this.logger.error('❌ Los datos de verificación no coinciden');
        throw new BadRequestException('Los datos de verificación no coinciden con el documento');
      }

      this.logger.log(`✅ Nota verificada exitosamente: ${note.folio}`);

      // 4. Calcular totales desde los items
      let subtotal = 0;
      let impuestos = 0;

      note.items.forEach(item => {
        subtotal += Number(item.subtotal);
        impuestos += Number(item.taxesTotal);
      });

      const total = subtotal + impuestos;

      // 5. Retornar datos de verificación
      return {
        valid: true,
        note: {
          folio: note.folio,
          fecha: note.saleDate,
          cliente: {
            nombre: note.customerName || 'PÚBLICO GENERAL',
            rfc: note.customerRfc || 'N/A',
          },
          items: note.items.map(item => ({
            cantidad: item.quantity,
            descripcion: item.description,
            precioUnitario: Number(item.unitPrice),
            importe: Number(item.subtotal),
          })),
          totales: {
            subtotal: subtotal,
            impuestos: impuestos,
            total: total,
          },
          status: note.status,
          fechaVerificacion: new Date(),
        }
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('❌ Error en verificación de nota:', error);
      throw new BadRequestException('Error al verificar la nota de venta');
    }
  }

  /**
   * Verifica por folio directo
   */
  async verifyNoteByFolio(folio: string) {
    try {
      this.logger.log(`🔍 Verificando nota por folio: ${folio}`);

      const note = await this.saleNoteRepository.findOne({
        where: { folio },
        relations: ['items'],
      });

      if (!note) {
        throw new NotFoundException('Nota de venta no encontrada');
      }

      // Calcular totales
      let subtotal = 0;
      let impuestos = 0;

      note.items.forEach(item => {
        subtotal += Number(item.subtotal);
        impuestos += Number(item.taxesTotal);
      });

      const total = subtotal + impuestos;

      return {
        valid: true,
        note: {
          folio: note.folio,
          fecha: note.saleDate,
          cliente: note.customerName || 'PÚBLICO GENERAL',
          total: total,
          status: note.status,
        }
      };
    } catch (error) {
      this.logger.error('❌ Error verificando por folio:', error);
      throw error;
    }
  }

  /**
   * Valida que los datos decodificados coincidan con la nota
   */
  private validateNoteData(
    note: SaleNote,
    decodedData: { folio: string; fecha: string; rfcEmisor: string; total: number }
  ): boolean {
    // Validar folio
    if (note.folio !== decodedData.folio) {
      return false;
    }

    // Calcular total real
    let totalReal = 0;
    note.items.forEach(item => {
      totalReal += Number(item.subtotal) + Number(item.taxesTotal);
    });

    // Validar total (con tolerancia de centavos)
    const totalDifference = Math.abs(totalReal - decodedData.total);
    if (totalDifference > 0.01) {
      this.logger.warn(`⚠️ Diferencia en total: ${totalDifference}`);
      return false;
    }

    return true;
  }
}