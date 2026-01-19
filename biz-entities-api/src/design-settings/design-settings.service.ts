import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DesignSettings } from './entities/design-settings.entity';
import { GetDesignSettingsDto } from './dto/get-design-settings.dto';
import { DocumentType, SaveDesignSettingDto } from './dto/save-design-setting.dto';
import { UsersService } from '../users/users.service';

@Injectable()
export class DesignSettingsService {
  private readonly logger = new Logger(DesignSettingsService.name);

  constructor(
    @InjectRepository(DesignSettings)
    private designSettingsRepository: Repository<DesignSettings>,
    private readonly usersService: UsersService
  ) {}

  async getDesignSettings(firebaseUid: string): Promise<GetDesignSettingsDto> {
    try {
      // Corregido: usar findUserByFirebaseUid en lugar de findByFirebaseUid
      const user = await this.usersService.findUserByFirebaseUid(firebaseUid);
      if (!user) {
        throw new NotFoundException(`Usuario no encontrado con UID: ${firebaseUid}`);
      }

      const settings = await this.designSettingsRepository.findOne({
        where: { userId: user.ID } // También cambiado: usar ID en mayúsculas según tu entidad
      });

      // Si no hay configuración, devuelve valores predeterminados
      if (!settings) {
        return {
          invoiceDesignId: 'classic',
          deliveryNoteDesignId: 'classic-delivery',
          quoteDesignId: 'classic-quote',
        };
      }

      return {
        invoiceDesignId: settings.invoiceDesignId || 'classic',
        deliveryNoteDesignId: settings.deliveryNoteDesignId || 'classic-delivery',
        quoteDesignId: settings.quoteDesignId || 'classic-quote',
      };
    } catch (error) {
      this.logger.error(`Error al obtener configuración de diseño: ${error.message}`, error.stack);
      throw error;
    }
  }

  async saveDesignSetting(firebaseUid: string, dto: SaveDesignSettingDto): Promise<void> {
    try {
      // Corregido: usar findUserByFirebaseUid en lugar de findByFirebaseUid
      const user = await this.usersService.findUserByFirebaseUid(firebaseUid);
      if (!user) {
        throw new NotFoundException(`Usuario no encontrado con UID: ${firebaseUid}`);
      }

      let settings = await this.designSettingsRepository.findOne({
        where: { userId: user.ID } // También cambiado: usar ID en mayúsculas
      });

      // Si no existe, crea un nuevo registro
      if (!settings) {
        settings = this.designSettingsRepository.create({
          userId: user.ID // También cambiado: usar ID en mayúsculas
        });
      }

      // Actualiza el campo correspondiente según el tipo de documento
      switch (dto.type) {
        case DocumentType.INVOICE:
          settings.invoiceDesignId = dto.designId;
          break;
        case DocumentType.DELIVERY:
          settings.deliveryNoteDesignId = dto.designId;
          break;
        case DocumentType.QUOTE:
          settings.quoteDesignId = dto.designId;
          break;
      }

      await this.designSettingsRepository.save(settings);
    } catch (error) {
      this.logger.error(`Error al guardar configuración de diseño: ${error.message}`, error.stack);
      throw error;
    }
  }
}